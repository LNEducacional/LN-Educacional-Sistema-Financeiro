package admin

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetFinancialKPIs returns aggregated financial indicators
// All calculations done in SQL for decimal precision
func (r *Repository) GetFinancialKPIs(ctx context.Context) (*FinancialKPIs, error) {
	query := `
		WITH order_stats AS (
			SELECT
				COALESCE(SUM(total_value), 0) as gmv,
				COALESCE(SUM(CASE WHEN payment_status = 'RELEASED'
					THEN total_value * company_percent / 100.0 ELSE 0 END), 0) as net_revenue,
				COUNT(*) as total_orders,
				COUNT(*) FILTER (WHERE status NOT IN ('CONCLUIDO', 'CANCELADO')) as pending_orders
			FROM orders
		),
		wallet_stats AS (
			SELECT
				COALESCE(SUM(balance_locked), 0) as escrow,
				COALESCE(SUM(balance_available), 0) as transferred
			FROM wallets
		)
		SELECT
			o.gmv,
			o.net_revenue,
			w.escrow,
			w.transferred,
			o.pending_orders,
			o.total_orders
		FROM order_stats o, wallet_stats w
	`

	var kpis FinancialKPIs
	err := r.db.QueryRow(ctx, query).Scan(
		&kpis.GMV,
		&kpis.NetRevenue,
		&kpis.Escrow,
		&kpis.Transferred,
		&kpis.PendingOrders,
		&kpis.TotalOrders,
	)
	if err != nil {
		return nil, err
	}
	return &kpis, nil
}

// GetMonthlyFinancials returns income vs payouts for the last N months
func (r *Repository) GetMonthlyFinancials(ctx context.Context, months int) ([]MonthlyFinancial, error) {
	query := `
		WITH months AS (
			SELECT generate_series(
				date_trunc('month', NOW()) - ($1 - 1) * interval '1 month',
				date_trunc('month', NOW()),
				'1 month'::interval
			)::date as month_start
		),
		order_data AS (
			SELECT
				date_trunc('month', created_at)::date as month_start,
				SUM(total_value) as gmv,
				SUM(CASE WHEN payment_status = 'RELEASED'
					THEN total_value * company_percent / 100.0 ELSE 0 END) as income,
				SUM(CASE WHEN payment_status = 'RELEASED'
					THEN collab_value ELSE 0 END) as payouts
			FROM orders
			WHERE created_at >= date_trunc('month', NOW()) - ($1 - 1) * interval '1 month'
			GROUP BY date_trunc('month', created_at)::date
		)
		SELECT
			TO_CHAR(m.month_start, 'YYYY-MM') as month,
			COALESCE(od.income, 0) as income,
			COALESCE(od.payouts, 0) as payouts,
			COALESCE(od.gmv, 0) as gmv
		FROM months m
		LEFT JOIN order_data od ON m.month_start = od.month_start
		ORDER BY m.month_start ASC
	`

	rows, err := r.db.Query(ctx, query, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []MonthlyFinancial
	for rows.Next() {
		var mf MonthlyFinancial
		if err := rows.Scan(&mf.Month, &mf.Income, &mf.Payouts, &mf.GMV); err != nil {
			return nil, err
		}
		results = append(results, mf)
	}
	return results, nil
}

// GetDelinquentUsers returns users with overdue unpaid orders
func (r *Repository) GetDelinquentUsers(ctx context.Context) ([]DelinquentUser, error) {
	query := `
		SELECT
			u.id,
			u.name,
			u.email,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			MIN(o.due_date) as oldest_due_date,
			EXTRACT(DAY FROM NOW() - MIN(o.due_date))::int as days_overdue,
			COUNT(o.id) as overdue_orders,
			u.delinquent_since
		FROM users u
		INNER JOIN orders o ON o.student_id = u.id
		WHERE u.is_delinquent = TRUE
		  AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
		  AND o.payment_status = 'LOCKED'
		  AND o.due_date < NOW()
		GROUP BY u.id, u.name, u.email, u.delinquent_since
		ORDER BY days_overdue DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []DelinquentUser
	for rows.Next() {
		var du DelinquentUser
		var delinquentSince *time.Time
		if err := rows.Scan(
			&du.ID,
			&du.Name,
			&du.Email,
			&du.TotalOwed,
			&du.OldestDueDate,
			&du.DaysOverdue,
			&du.OverdueOrders,
			&delinquentSince,
		); err != nil {
			return nil, err
		}
		if delinquentSince != nil {
			du.DelinquentSince = *delinquentSince
		}
		users = append(users, du)
	}
	return users, nil
}

// CheckAndMarkDelinquents scans for users with overdue orders and marks them
// Returns the count of newly marked delinquents
// Also records delinquency history for tracking multiple periods
func (r *Repository) CheckAndMarkDelinquents(ctx context.Context, gracePeriodDays int) (*DelinquencyCheckResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	result := &DelinquencyCheckResult{
		RunAt: time.Now(),
	}

	// STEP 1: Find users who should be delinquent but aren't, with their overdue info
	findNewDelinquentsQuery := `
		SELECT
			o.student_id,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			array_agg(DISTINCT o.id) as order_ids
		FROM orders o
		JOIN users u ON u.id = o.student_id
		WHERE o.status NOT IN ('CONCLUIDO', 'CANCELADO')
		  AND o.payment_status = 'LOCKED'
		  AND o.due_date < NOW() - make_interval(days => $1)
		  AND u.is_delinquent = FALSE
		GROUP BY o.student_id
	`

	rows, err := tx.Query(ctx, findNewDelinquentsQuery, gracePeriodDays)
	if err != nil {
		return nil, fmt.Errorf("find new delinquents: %w", err)
	}

	type newDelinquent struct {
		UserID    string
		TotalOwed float64
		OrderIDs  []string
	}
	var newDelinquents []newDelinquent

	for rows.Next() {
		var nd newDelinquent
		if err := rows.Scan(&nd.UserID, &nd.TotalOwed, &nd.OrderIDs); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan new delinquent: %w", err)
		}
		newDelinquents = append(newDelinquents, nd)
	}
	rows.Close()

	// STEP 2: Mark new delinquents and create history entries
	for _, nd := range newDelinquents {
		// Mark user as delinquent
		markQuery := `
			UPDATE users
			SET is_delinquent = TRUE, delinquent_since = NOW()
			WHERE id = $1 AND is_delinquent = FALSE
		`
		cmdTag, err := tx.Exec(ctx, markQuery, nd.UserID)
		if err != nil {
			return nil, fmt.Errorf("mark delinquent %s: %w", nd.UserID, err)
		}

		if cmdTag.RowsAffected() > 0 {
			// Create delinquency history entry
			historyQuery := `
				INSERT INTO delinquency_history
					(user_id, started_at, total_owed_at_start, triggering_order_ids)
				VALUES ($1, NOW(), $2, $3)
			`
			_, err = tx.Exec(ctx, historyQuery, nd.UserID, nd.TotalOwed, nd.OrderIDs)
			if err != nil {
				return nil, fmt.Errorf("create history for %s: %w", nd.UserID, err)
			}
			result.NewDelinquents++
		}
	}

	// STEP 3: Find users to clear (no longer have overdue orders)
	findToClearQuery := `
		SELECT u.id
		FROM users u
		WHERE u.is_delinquent = TRUE
		  AND NOT EXISTS (
			SELECT 1 FROM orders o
			WHERE o.student_id = u.id
			  AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
			  AND o.payment_status = 'LOCKED'
			  AND o.due_date < NOW() - make_interval(days => $1)
		  )
	`

	rows, err = tx.Query(ctx, findToClearQuery, gracePeriodDays)
	if err != nil {
		return nil, fmt.Errorf("find to clear: %w", err)
	}

	var usersToClear []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan to clear: %w", err)
		}
		usersToClear = append(usersToClear, userID)
	}
	rows.Close()

	// STEP 4: Clear delinquent status and close history entries
	for _, userID := range usersToClear {
		// Get current owed amount for history
		var totalOwed float64
		owedQuery := `
			SELECT COALESCE(SUM(total_value), 0)
			FROM orders
			WHERE student_id = $1
			  AND status NOT IN ('CONCLUIDO', 'CANCELADO')
			  AND payment_status = 'LOCKED'
		`
		if err := tx.QueryRow(ctx, owedQuery, userID).Scan(&totalOwed); err != nil {
			return nil, fmt.Errorf("get owed for %s: %w", userID, err)
		}

		// Close the open delinquency history entry
		closeHistoryQuery := `
			UPDATE delinquency_history
			SET ended_at = NOW(),
			    total_owed_at_end = $2,
			    resolution_type = 'PAID',
			    updated_at = NOW()
			WHERE user_id = $1 AND ended_at IS NULL
		`
		_, err = tx.Exec(ctx, closeHistoryQuery, userID, totalOwed)
		if err != nil {
			return nil, fmt.Errorf("close history for %s: %w", userID, err)
		}

		// Clear delinquent status
		clearQuery := `
			UPDATE users
			SET is_delinquent = FALSE, delinquent_since = NULL
			WHERE id = $1
		`
		cmdTag, err := tx.Exec(ctx, clearQuery, userID)
		if err != nil {
			return nil, fmt.Errorf("clear delinquent %s: %w", userID, err)
		}

		if cmdTag.RowsAffected() > 0 {
			result.Cleared++
		}
	}

	// Count total checked
	countQuery := `SELECT COUNT(*) FROM users WHERE role = 'STUDENT'`
	err = tx.QueryRow(ctx, countQuery).Scan(&result.Checked)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return result, nil
}

// StreamDelinquentUsersCSV returns a callback to iterate over delinquent users for CSV export
// Uses server-side cursor for memory efficiency with large datasets
func (r *Repository) StreamDelinquentUsersCSV(ctx context.Context, fn func(DelinquentUser) error) error {
	query := `
		SELECT
			u.id,
			u.name,
			u.email,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			MIN(o.due_date) as oldest_due_date,
			EXTRACT(DAY FROM NOW() - MIN(o.due_date))::int as days_overdue,
			COUNT(o.id) as overdue_orders,
			u.delinquent_since
		FROM users u
		INNER JOIN orders o ON o.student_id = u.id
		WHERE u.is_delinquent = TRUE
		  AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
		  AND o.payment_status = 'LOCKED'
		  AND o.due_date < NOW()
		GROUP BY u.id, u.name, u.email, u.delinquent_since
		ORDER BY total_owed DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var du DelinquentUser
		var delinquentSince *time.Time
		if err := rows.Scan(
			&du.ID,
			&du.Name,
			&du.Email,
			&du.TotalOwed,
			&du.OldestDueDate,
			&du.DaysOverdue,
			&du.OverdueOrders,
			&delinquentSince,
		); err != nil {
			return err
		}
		if delinquentSince != nil {
			du.DelinquentSince = *delinquentSince
		}
		if err := fn(du); err != nil {
			return err
		}
	}
	return rows.Err()
}

// GetUserByID retrieves a single user by ID
func (r *Repository) GetUserByID(ctx context.Context, userID string) (*DelinquentUser, error) {
	query := `
		SELECT
			u.id,
			u.name,
			u.email,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			COALESCE(MIN(o.due_date), NOW()) as oldest_due_date,
			COALESCE(EXTRACT(DAY FROM NOW() - MIN(o.due_date))::int, 0) as days_overdue,
			COUNT(o.id) as overdue_orders,
			u.delinquent_since
		FROM users u
		LEFT JOIN orders o ON o.student_id = u.id
			AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
			AND o.payment_status = 'LOCKED'
			AND o.due_date < NOW()
		WHERE u.id = $1
		GROUP BY u.id, u.name, u.email, u.delinquent_since
	`

	var du DelinquentUser
	var delinquentSince *time.Time
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&du.ID,
		&du.Name,
		&du.Email,
		&du.TotalOwed,
		&du.OldestDueDate,
		&du.DaysOverdue,
		&du.OverdueOrders,
		&delinquentSince,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if delinquentSince != nil {
		du.DelinquentSince = *delinquentSince
	}
	return &du, nil
}

// ListCollaborators returns all collaborators with aggregated metrics
func (r *Repository) ListCollaborators(ctx context.Context) ([]CollaboratorSummary, error) {
	query := `
		WITH collab_stats AS (
			SELECT
				o.collaborator_id,
				COUNT(*) as total_jobs,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO') as completed_jobs,
				COUNT(*) FILTER (WHERE o.status NOT IN ('CONCLUIDO', 'CANCELADO')) as pending_jobs,
				COUNT(*) FILTER (WHERE o.status = 'ATRASADO') as delayed_jobs,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as total_earnings,
				COALESCE(SUM(CASE WHEN o.payment_status = 'LOCKED' THEN o.collab_value ELSE 0 END), 0) as pending_earnings,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO' AND o.due_date >= o.updated_at) as on_time_deliveries
			FROM orders o
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		),
		rating_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(AVG(r.score), 0) as avg_rating,
				COUNT(r.id) as total_ratings
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			u.email,
			cp.specialty,
			COALESCE(cp.internal_ranking, 0) as internal_ranking,
			COALESCE(cs.total_jobs, 0) as total_jobs,
			COALESCE(cs.completed_jobs, 0) as completed_jobs,
			COALESCE(cs.pending_jobs, 0) as pending_jobs,
			COALESCE(cs.delayed_jobs, 0) as delayed_jobs,
			COALESCE(cs.total_earnings, 0) as total_earnings,
			COALESCE(cs.pending_earnings, 0) as pending_earnings,
			COALESCE(rs.avg_rating, 0) as avg_rating,
			COALESCE(rs.total_ratings, 0) as total_ratings,
			CASE
				WHEN COALESCE(cs.completed_jobs, 0) = 0 THEN 0
				ELSE ROUND((COALESCE(cs.on_time_deliveries, 0)::numeric / cs.completed_jobs::numeric) * 100, 2)
			END as on_time_delivery_pct
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		LEFT JOIN rating_stats rs ON rs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
		ORDER BY COALESCE(cs.total_jobs, 0) DESC, u.name ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collaborators []CollaboratorSummary
	for rows.Next() {
		var c CollaboratorSummary
		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.Email,
			&c.Specialty,
			&c.InternalRanking,
			&c.TotalJobs,
			&c.CompletedJobs,
			&c.PendingJobs,
			&c.DelayedJobs,
			&c.TotalEarnings,
			&c.PendingEarnings,
			&c.AvgRating,
			&c.TotalRatings,
			&c.OnTimeDeliveryPct,
		); err != nil {
			return nil, err
		}
		collaborators = append(collaborators, c)
	}
	return collaborators, nil
}

// GetCollaboratorByID returns detailed info for a single collaborator
func (r *Repository) GetCollaboratorByID(ctx context.Context, collabID string) (*CollaboratorDetail, error) {
	// First get summary data
	query := `
		WITH collab_stats AS (
			SELECT
				o.collaborator_id,
				COUNT(*) as total_jobs,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO') as completed_jobs,
				COUNT(*) FILTER (WHERE o.status NOT IN ('CONCLUIDO', 'CANCELADO')) as pending_jobs,
				COUNT(*) FILTER (WHERE o.status = 'ATRASADO') as delayed_jobs,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as total_earnings,
				COALESCE(SUM(CASE WHEN o.payment_status = 'LOCKED' THEN o.collab_value ELSE 0 END), 0) as pending_earnings,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO' AND o.due_date >= o.updated_at) as on_time_deliveries
			FROM orders o
			WHERE o.collaborator_id = $1
			GROUP BY o.collaborator_id
		),
		rating_stats AS (
			SELECT
				COALESCE(AVG(r.score), 0) as avg_rating,
				COUNT(r.id) as total_ratings
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id = $1
		),
		revision_stats AS (
			SELECT COUNT(rev.id) as total_revisions
			FROM order_revisions rev
			JOIN orders o ON o.id = rev.order_id
			WHERE o.collaborator_id = $1
		),
		refund_stats AS (
			SELECT
				COUNT(*) as total_refunds,
				COALESCE(SUM(o.collab_value), 0) as total_refunds_amount
			FROM orders o
			WHERE o.collaborator_id = $1 AND o.payment_status = 'REFUNDED'
		)
		SELECT
			u.id,
			u.name,
			u.email,
			cp.specialty,
			COALESCE(cp.internal_ranking, 0) as internal_ranking,
			COALESCE(cs.total_jobs, 0) as total_jobs,
			COALESCE(cs.completed_jobs, 0) as completed_jobs,
			COALESCE(cs.pending_jobs, 0) as pending_jobs,
			COALESCE(cs.delayed_jobs, 0) as delayed_jobs,
			COALESCE(cs.total_earnings, 0) as total_earnings,
			COALESCE(cs.pending_earnings, 0) as pending_earnings,
			COALESCE(rs.avg_rating, 0) as avg_rating,
			COALESCE(rs.total_ratings, 0) as total_ratings,
			CASE
				WHEN COALESCE(cs.completed_jobs, 0) = 0 THEN 0
				ELSE ROUND((COALESCE(cs.on_time_deliveries, 0)::numeric / cs.completed_jobs::numeric) * 100, 2)
			END as on_time_delivery_pct,
			cp.pix_key,
			COALESCE(w.balance_available, 0) as balance_available,
			COALESCE(w.balance_locked, 0) as balance_locked,
			u.created_at,
			COALESCE(revs.total_revisions, 0) as total_revisions_count,
			COALESCE(refs.total_refunds, 0) as total_refunds_count,
			COALESCE(refs.total_refunds_amount, 0) as total_refunds_amount
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON TRUE
		LEFT JOIN rating_stats rs ON TRUE
		LEFT JOIN revision_stats revs ON TRUE
		LEFT JOIN refund_stats refs ON TRUE
		LEFT JOIN wallets w ON w.user_id = u.id
		WHERE u.id = $1 AND u.role = 'COLLABORATOR'
	`

	var c CollaboratorDetail
	err := r.db.QueryRow(ctx, query, collabID).Scan(
		&c.ID,
		&c.Name,
		&c.Email,
		&c.Specialty,
		&c.InternalRanking,
		&c.TotalJobs,
		&c.CompletedJobs,
		&c.PendingJobs,
		&c.DelayedJobs,
		&c.TotalEarnings,
		&c.PendingEarnings,
		&c.AvgRating,
		&c.TotalRatings,
		&c.OnTimeDeliveryPct,
		&c.PixKey,
		&c.BalanceAvailable,
		&c.BalanceLocked,
		&c.CreatedAt,
		&c.TotalRevisionsCount,
		&c.TotalRefundsCount,
		&c.TotalRefundsAmount,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Get recent jobs
	jobs, err := r.getCollaboratorRecentJobs(ctx, collabID)
	if err != nil {
		return nil, err
	}
	c.RecentJobs = jobs

	// Get recent revisions
	revisions, err := r.getCollaboratorRecentRevisions(ctx, collabID)
	if err != nil {
		return nil, err
	}
	c.RecentRevisions = revisions

	return &c, nil
}

func (r *Repository) getCollaboratorRecentJobs(ctx context.Context, collabID string) ([]CollaboratorJob, error) {
	query := `
		SELECT
			o.id,
			s.name as student_name,
			sv.name as service_name,
			o.status,
			o.payment_status,
			o.total_value,
			o.collab_value,
			o.due_date,
			o.created_at
		FROM orders o
		JOIN users s ON s.id = o.student_id
		JOIN services sv ON sv.id = o.service_id
		WHERE o.collaborator_id = $1
		ORDER BY o.created_at DESC
		LIMIT 20
	`

	rows, err := r.db.Query(ctx, query, collabID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []CollaboratorJob
	for rows.Next() {
		var j CollaboratorJob
		if err := rows.Scan(
			&j.ID,
			&j.StudentName,
			&j.ServiceName,
			&j.Status,
			&j.PaymentStatus,
			&j.TotalValue,
			&j.CollabValue,
			&j.DueDate,
			&j.CreatedAt,
		); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}

func (r *Repository) getCollaboratorRecentRevisions(ctx context.Context, collabID string) ([]CollaboratorRevision, error) {
	query := `
		SELECT
			rev.id,
			rev.order_id,
			s.name as student_name,
			rev.reason,
			rev.created_at
		FROM order_revisions rev
		JOIN orders o ON o.id = rev.order_id
		JOIN users s ON s.id = o.student_id
		WHERE o.collaborator_id = $1
		ORDER BY rev.created_at DESC
		LIMIT 10
	`

	rows, err := r.db.Query(ctx, query, collabID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []CollaboratorRevision
	for rows.Next() {
		var rev CollaboratorRevision
		if err := rows.Scan(
			&rev.ID,
			&rev.OrderID,
			&rev.StudentName,
			&rev.Reason,
			&rev.CreatedAt,
		); err != nil {
			return nil, err
		}
		revisions = append(revisions, rev)
	}
	return revisions, nil
}

// GetComplaints returns production jobs with problematic status (revision needed or not approved)
func (r *Repository) GetComplaints(ctx context.Context) ([]ComplaintItem, error) {
	// Get production jobs with AGUARDANDO_REVISAO or NAO_APROVADO status
	query := `
		SELECT
			pj.id,
			st.name as student_name,
			st.email as student_email,
			COALESCE(col.name, 'Nao atribuido') as collaborator_name,
			pj.title as service_name,
			pj.status::text,
			pj.price as total_value,
			pj.deadline as due_date,
			(SELECT COUNT(*) FROM job_histories jh WHERE jh.job_id = pj.id AND jh.new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')) as revision_count,
			(SELECT jh.comments FROM job_histories jh WHERE jh.job_id = pj.id ORDER BY jh.created_at DESC LIMIT 1) as latest_reason,
			pj.updated_at as latest_revision_at
		FROM production_jobs pj
		JOIN users st ON st.id = pj.student_id
		LEFT JOIN users col ON col.id = pj.collaborator_id
		WHERE pj.status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
		ORDER BY pj.updated_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var complaints []ComplaintItem
	for rows.Next() {
		var c ComplaintItem
		if err := rows.Scan(
			&c.ID,
			&c.StudentName,
			&c.StudentEmail,
			&c.CollaboratorName,
			&c.ServiceName,
			&c.Status,
			&c.TotalValue,
			&c.DueDate,
			&c.RevisionCount,
			&c.LatestReason,
			&c.LatestRevisionAt,
		); err != nil {
			return nil, err
		}
		complaints = append(complaints, c)
	}

	if complaints == nil {
		complaints = []ComplaintItem{}
	}

	return complaints, nil
}

// GetRefunds returns all refunded transactions
func (r *Repository) GetRefunds(ctx context.Context) (*RefundReport, error) {
	// Get summary from orders with payment_status = 'REFUNDED'
	summaryQuery := `
		SELECT
			COALESCE(SUM(total_value), 0) as total_refunded,
			COUNT(*) as total_count
		FROM orders
		WHERE payment_status = 'REFUNDED'
	`

	var report RefundReport
	err := r.db.QueryRow(ctx, summaryQuery).Scan(&report.TotalRefunded, &report.TotalCount)
	if err != nil {
		return nil, err
	}

	// Get individual refunds from orders
	listQuery := `
		SELECT
			o.id,
			o.id as order_id,
			st.name as student_name,
			COALESCE(col.name, 'N/A') as collaborator_name,
			o.total_value as amount,
			o.updated_at as refunded_at
		FROM orders o
		JOIN users st ON st.id = o.student_id
		LEFT JOIN users col ON col.id = o.collaborator_id
		WHERE o.payment_status = 'REFUNDED'
		ORDER BY o.updated_at DESC
		LIMIT 100
	`

	rows, err := r.db.Query(ctx, listQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item RefundItem
		if err := rows.Scan(
			&item.ID,
			&item.OrderID,
			&item.StudentName,
			&item.CollaboratorName,
			&item.Amount,
			&item.RefundedAt,
		); err != nil {
			return nil, err
		}
		report.Refunds = append(report.Refunds, item)
	}

	if report.Refunds == nil {
		report.Refunds = []RefundItem{}
	}

	return &report, nil
}

// GetWeeklyFinancials returns income vs payouts for the last N weeks
func (r *Repository) GetWeeklyFinancials(ctx context.Context, weeks int) ([]WeeklyFinancial, error) {
	query := `
		WITH weeks AS (
			SELECT generate_series(
				date_trunc('week', NOW()) - ($1 - 1) * interval '1 week',
				date_trunc('week', NOW()),
				'1 week'::interval
			)::date as week_start
		),
		order_data AS (
			SELECT
				date_trunc('week', created_at)::date as week_start,
				SUM(total_value) as gmv,
				SUM(CASE WHEN payment_status = 'RELEASED'
					THEN total_value * company_percent / 100.0 ELSE 0 END) as income,
				SUM(CASE WHEN payment_status = 'RELEASED'
					THEN collab_value ELSE 0 END) as payouts
			FROM orders
			WHERE created_at >= date_trunc('week', NOW()) - ($1 - 1) * interval '1 week'
			GROUP BY date_trunc('week', created_at)::date
		)
		SELECT
			TO_CHAR(w.week_start, 'IYYY-"W"IW') as week,
			COALESCE(od.income, 0) as income,
			COALESCE(od.payouts, 0) as payouts,
			COALESCE(od.gmv, 0) as gmv
		FROM weeks w
		LEFT JOIN order_data od ON w.week_start = od.week_start
		ORDER BY w.week_start ASC
	`

	rows, err := r.db.Query(ctx, query, weeks)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []WeeklyFinancial
	for rows.Next() {
		var wf WeeklyFinancial
		if err := rows.Scan(&wf.Week, &wf.Income, &wf.Payouts, &wf.GMV); err != nil {
			return nil, err
		}
		results = append(results, wf)
	}
	return results, nil
}

// GetRevisionSummary returns aggregated revision statistics
func (r *Repository) GetRevisionSummary(ctx context.Context) (*RevisionSummary, error) {
	query := `
		WITH revision_stats AS (
			SELECT
				COUNT(*) as total_revisions,
				COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as this_month,
				COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW() - interval '1 month')
					AND created_at < date_trunc('month', NOW())) as last_month
			FROM job_histories
			WHERE new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
		),
		order_count AS (
			SELECT COUNT(DISTINCT job_id) as total_orders
			FROM job_histories
		),
		top_reasons AS (
			SELECT
				COALESCE(comments, 'Sem motivo especificado') as reason,
				COUNT(*) as count
			FROM job_histories
			WHERE new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
				AND comments IS NOT NULL AND comments != ''
			GROUP BY comments
			ORDER BY count DESC
			LIMIT 5
		)
		SELECT
			COALESCE(rs.total_revisions, 0),
			CASE WHEN oc.total_orders > 0
				THEN ROUND(rs.total_revisions::numeric / oc.total_orders::numeric, 2)
				ELSE 0 END as avg_per_order,
			COALESCE(rs.this_month, 0),
			COALESCE(rs.last_month, 0)
		FROM revision_stats rs, order_count oc
	`

	var summary RevisionSummary
	err := r.db.QueryRow(ctx, query).Scan(
		&summary.TotalRevisions,
		&summary.AvgPerOrder,
		&summary.ThisMonth,
		&summary.LastMonth,
	)
	if err != nil {
		return nil, err
	}

	// Get top reasons separately
	reasonsQuery := `
		SELECT
			COALESCE(comments, 'Sem motivo especificado') as reason,
			COUNT(*) as count
		FROM job_histories
		WHERE new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
			AND comments IS NOT NULL AND comments != ''
		GROUP BY comments
		ORDER BY count DESC
		LIMIT 5
	`

	rows, err := r.db.Query(ctx, reasonsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var rc ReasonCount
		if err := rows.Scan(&rc.Reason, &rc.Count); err != nil {
			return nil, err
		}
		summary.TopReasons = append(summary.TopReasons, rc)
	}

	if summary.TopReasons == nil {
		summary.TopReasons = []ReasonCount{}
	}

	return &summary, nil
}

// GetActiveJobs returns paginated list of active (non-completed) jobs
func (r *Repository) GetActiveJobs(ctx context.Context, page, pageSize int, status, collaboratorID, sortBy, sortDir string) (*ActiveJobsResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Build dynamic WHERE clause
	whereClause := "WHERE pj.status NOT IN ('CONCLUIDO')"
	args := []interface{}{}
	argIndex := 1

	if status != "" {
		whereClause += fmt.Sprintf(" AND pj.status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if collaboratorID != "" {
		whereClause += fmt.Sprintf(" AND pj.collaborator_id = $%d", argIndex)
		args = append(args, collaboratorID)
		argIndex++
	}

	// Build ORDER BY clause with allowed columns only (prevent SQL injection)
	orderByClause := "ORDER BY pj.deadline ASC"
	allowedSortColumns := map[string]string{
		"service_name":      "pj.title",
		"student_name":      "st.name",
		"collaborator_name": "col.name",
		"status":            "pj.status",
		"due_date":          "pj.deadline",
		"total_value":       "pj.price",
		"created_at":        "pj.created_at",
	}

	if sortBy != "" {
		if column, ok := allowedSortColumns[sortBy]; ok {
			direction := "ASC"
			if sortDir == "desc" {
				direction = "DESC"
			}
			orderByClause = fmt.Sprintf("ORDER BY %s %s", column, direction)
		}
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM production_jobs pj ` + whereClause
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Get paginated results
	// Note: payment_status is derived from financial_transaction_id presence
	query := fmt.Sprintf(`
		SELECT
			pj.id,
			st.name as student_name,
			COALESCE(col.name, 'Nao atribuido') as collaborator_name,
			pj.title as service_name,
			pj.status::text,
			CASE WHEN pj.financial_transaction_id IS NOT NULL THEN 'PAID' ELSE 'PENDING' END as payment_status,
			pj.deadline as due_date,
			EXTRACT(DAY FROM pj.deadline - NOW())::int as days_until_due,
			pj.price as total_value,
			pj.created_at
		FROM production_jobs pj
		JOIN users st ON st.id = pj.student_id
		LEFT JOIN users col ON col.id = pj.collaborator_id
		%s
		%s
		LIMIT $%d OFFSET $%d`, whereClause, orderByClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []ActiveJob
	for rows.Next() {
		var job ActiveJob
		if err := rows.Scan(
			&job.ID,
			&job.StudentName,
			&job.CollaboratorName,
			&job.ServiceName,
			&job.Status,
			&job.PaymentStatus,
			&job.DueDate,
			&job.DaysUntilDue,
			&job.TotalValue,
			&job.CreatedAt,
		); err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}

	if jobs == nil {
		jobs = []ActiveJob{}
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &ActiveJobsResponse{
		Jobs:       jobs,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetAlerts returns alert items for overdue, due today, due tomorrow and complaints
func (r *Repository) GetAlerts(ctx context.Context) (*AlertsResponse, error) {
	// Get counts
	countsQuery := `
		SELECT
			COUNT(*) FILTER (WHERE deadline < NOW()::date) as overdue,
			COUNT(*) FILTER (WHERE deadline::date = NOW()::date) as due_today,
			COUNT(*) FILTER (WHERE deadline::date = (NOW() + interval '1 day')::date) as due_tomorrow
		FROM production_jobs
		WHERE status NOT IN ('CONCLUIDO')
	`

	var response AlertsResponse
	err := r.db.QueryRow(ctx, countsQuery).Scan(
		&response.OverdueCount,
		&response.DueTodayCount,
		&response.DueTomorrowCount,
	)
	if err != nil {
		return nil, err
	}

	// Get complaints count
	complaintsQuery := `
		SELECT COUNT(*)
		FROM production_jobs
		WHERE status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
	`
	err = r.db.QueryRow(ctx, complaintsQuery).Scan(&response.ComplaintsCount)
	if err != nil {
		return nil, err
	}

	response.TotalCount = response.OverdueCount + response.DueTodayCount + response.DueTomorrowCount + response.ComplaintsCount

	// Get alert items (limit to 20 most urgent)
	itemsQuery := `
		WITH alerts AS (
			SELECT
				pj.id,
				COALESCE(
					CASE
						WHEN pj.deadline < NOW()::date THEN 'OVERDUE'
						WHEN pj.deadline::date = NOW()::date THEN 'DUE_TODAY'
						WHEN pj.deadline::date = (NOW() + interval '1 day')::date THEN 'DUE_TOMORROW'
						WHEN pj.status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO') THEN 'COMPLAINT'
						ELSE 'OTHER'
					END,
					'OTHER'
				) as type,
				pj.title,
				st.name as student_name,
				COALESCE(col.name, 'Nao atribuido') as collaborator_name,
				pj.deadline,
				pj.status::text,
				CASE
					WHEN pj.deadline < NOW()::date THEN 'HIGH'
					WHEN pj.deadline::date = NOW()::date THEN 'HIGH'
					WHEN pj.status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO') THEN 'MEDIUM'
					ELSE 'LOW'
				END as priority
			FROM production_jobs pj
			JOIN users st ON st.id = pj.student_id
			LEFT JOIN users col ON col.id = pj.collaborator_id
			WHERE pj.status NOT IN ('CONCLUIDO')
				AND (
					pj.deadline < NOW()::date
					OR pj.deadline::date = NOW()::date
					OR pj.deadline::date = (NOW() + interval '1 day')::date
					OR pj.status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
				)
		)
		SELECT id, type, title, student_name, collaborator_name, deadline, status, priority
		FROM alerts
		ORDER BY
			CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
			deadline ASC
		LIMIT 20
	`

	rows, err := r.db.Query(ctx, itemsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item AlertItem
		var studentName, collabName, status string
		var deadline time.Time
		if err := rows.Scan(
			&item.ID,
			&item.Type,
			&item.Title,
			&studentName,
			&collabName,
			&deadline,
			&status,
			&item.Priority,
		); err != nil {
			return nil, err
		}
		item.Description = studentName + " - " + collabName + " - Entrega: " + deadline.Format("02/01/2006")
		response.Items = append(response.Items, item)
	}

	if response.Items == nil {
		response.Items = []AlertItem{}
	}

	return &response, nil
}

// GetRankingByProduction returns ranking by number of completed jobs
func (r *Repository) GetRankingByProduction(ctx context.Context, limit int) ([]RankingEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		WITH collab_stats AS (
			SELECT
				pj.collaborator_id,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') as completed_jobs,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO'
					AND pj.updated_at >= date_trunc('month', NOW() - interval '1 month')
					AND pj.updated_at < date_trunc('month', NOW())) as completed_last_month,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO'
					AND pj.updated_at >= date_trunc('month', NOW())) as completed_this_month
			FROM production_jobs pj
			WHERE pj.collaborator_id IS NOT NULL
			GROUP BY pj.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			COALESCE(cs.completed_jobs, 0) as value,
			COALESCE(cs.completed_this_month, 0) as secondary_value,
			CASE
				WHEN COALESCE(cs.completed_this_month, 0) > COALESCE(cs.completed_last_month, 0) THEN 'UP'
				WHEN COALESCE(cs.completed_this_month, 0) < COALESCE(cs.completed_last_month, 0) THEN 'DOWN'
				ELSE 'STABLE'
			END as trend
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
		ORDER BY COALESCE(cs.completed_jobs, 0) DESC, u.name ASC
		LIMIT $1
	`

	return r.scanRankingEntries(ctx, query, limit)
}

// GetRankingByRevenue returns ranking by total earnings
func (r *Repository) GetRankingByRevenue(ctx context.Context, limit int) ([]RankingEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		WITH collab_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as total_earnings,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED'
					AND o.updated_at >= date_trunc('month', NOW() - interval '1 month')
					AND o.updated_at < date_trunc('month', NOW()) THEN o.collab_value ELSE 0 END), 0) as earnings_last_month,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED'
					AND o.updated_at >= date_trunc('month', NOW()) THEN o.collab_value ELSE 0 END), 0) as earnings_this_month
			FROM orders o
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			COALESCE(cs.total_earnings, 0) as value,
			COALESCE(cs.earnings_this_month, 0) as secondary_value,
			CASE
				WHEN COALESCE(cs.earnings_this_month, 0) > COALESCE(cs.earnings_last_month, 0) THEN 'UP'
				WHEN COALESCE(cs.earnings_this_month, 0) < COALESCE(cs.earnings_last_month, 0) THEN 'DOWN'
				ELSE 'STABLE'
			END as trend
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
		ORDER BY COALESCE(cs.total_earnings, 0) DESC, u.name ASC
		LIMIT $1
	`

	return r.scanRankingEntries(ctx, query, limit)
}

// GetRankingByPunctuality returns ranking by on-time delivery percentage
func (r *Repository) GetRankingByPunctuality(ctx context.Context, limit int) ([]RankingEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		WITH collab_stats AS (
			SELECT
				pj.collaborator_id,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') as total_completed,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO' AND pj.deadline >= pj.updated_at) as on_time
			FROM production_jobs pj
			WHERE pj.collaborator_id IS NOT NULL
			GROUP BY pj.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			CASE
				WHEN COALESCE(cs.total_completed, 0) = 0 THEN 0
				ELSE ROUND((COALESCE(cs.on_time, 0)::numeric / cs.total_completed::numeric) * 100, 2)
			END as value,
			COALESCE(cs.total_completed, 0)::float8 as secondary_value,
			'STABLE' as trend
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
			AND COALESCE(cs.total_completed, 0) >= 3
		ORDER BY value DESC, COALESCE(cs.total_completed, 0) DESC, u.name ASC
		LIMIT $1
	`

	return r.scanRankingEntries(ctx, query, limit)
}

// GetRankingBySatisfaction returns ranking by average rating
func (r *Repository) GetRankingBySatisfaction(ctx context.Context, limit int) ([]RankingEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		WITH collab_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(AVG(r.score), 0) as avg_rating,
				COUNT(r.id) as total_ratings
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			COALESCE(cs.avg_rating, 0) as value,
			COALESCE(cs.total_ratings, 0)::float8 as secondary_value,
			'STABLE' as trend
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
			AND COALESCE(cs.total_ratings, 0) >= 3
		ORDER BY COALESCE(cs.avg_rating, 0) DESC, COALESCE(cs.total_ratings, 0) DESC, u.name ASC
		LIMIT $1
	`

	return r.scanRankingEntries(ctx, query, limit)
}

// GetRankingByQuality returns ranking by internal ranking score
func (r *Repository) GetRankingByQuality(ctx context.Context, limit int) ([]RankingEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		WITH collab_stats AS (
			SELECT
				pj.collaborator_id,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') as completed_jobs,
				COUNT(*) FILTER (WHERE EXISTS (
					SELECT 1 FROM job_histories jh
					WHERE jh.job_id = pj.id AND jh.new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
				)) as revision_jobs
			FROM production_jobs pj
			WHERE pj.collaborator_id IS NOT NULL
			GROUP BY pj.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			COALESCE(cp.internal_ranking, 0) as value,
			COALESCE(cs.completed_jobs, 0)::float8 as secondary_value,
			'STABLE' as trend
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
		ORDER BY COALESCE(cp.internal_ranking, 0) DESC, COALESCE(cs.completed_jobs, 0) DESC, u.name ASC
		LIMIT $1
	`

	return r.scanRankingEntries(ctx, query, limit)
}

// scanRankingEntries is a helper to scan ranking query results
func (r *Repository) scanRankingEntries(ctx context.Context, query string, limit int) ([]RankingEntry, error) {
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []RankingEntry
	position := 1
	for rows.Next() {
		var entry RankingEntry
		var secondaryValue float64
		if err := rows.Scan(
			&entry.CollaboratorID,
			&entry.Name,
			&entry.Specialty,
			&entry.Value,
			&secondaryValue,
			&entry.Trend,
		); err != nil {
			return nil, err
		}
		entry.Position = position
		entry.SecondaryValue = &secondaryValue
		entries = append(entries, entry)
		position++
	}

	if entries == nil {
		entries = []RankingEntry{}
	}

	return entries, nil
}

// GetProductivityStats returns aggregated productivity metrics
func (r *Repository) GetProductivityStats(ctx context.Context) (*ProductivityStats, error) {
	query := `
		WITH collab_metrics AS (
			SELECT
				COUNT(DISTINCT u.id) as total_collaborators,
				COUNT(DISTINCT CASE WHEN pj.id IS NOT NULL AND pj.status NOT IN ('CONCLUIDO')
					THEN u.id END) as active_collaborators
			FROM users u
			LEFT JOIN production_jobs pj ON pj.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
		),
		job_metrics AS (
			SELECT
				COUNT(*) as total_jobs,
				COUNT(*) FILTER (WHERE status = 'CONCLUIDO'
					AND updated_at >= date_trunc('month', NOW())) as completed_this_month,
				COUNT(*) FILTER (WHERE status = 'CONCLUIDO' AND deadline >= updated_at) as on_time,
				COUNT(*) FILTER (WHERE status = 'CONCLUIDO') as total_completed
			FROM production_jobs
		),
		rating_metrics AS (
			SELECT COALESCE(AVG(score), 0) as avg_rating
			FROM ratings
		)
		SELECT
			cm.total_collaborators,
			cm.active_collaborators,
			CASE WHEN cm.total_collaborators > 0
				THEN ROUND(jm.total_jobs::numeric / cm.total_collaborators::numeric, 2)
				ELSE 0 END as avg_jobs_per_collab,
			CASE WHEN jm.total_completed > 0
				THEN ROUND((jm.on_time::numeric / jm.total_completed::numeric) * 100, 2)
				ELSE 0 END as avg_on_time_delivery,
			jm.completed_this_month,
			rm.avg_rating
		FROM collab_metrics cm, job_metrics jm, rating_metrics rm
	`

	var stats ProductivityStats
	err := r.db.QueryRow(ctx, query).Scan(
		&stats.TotalCollaborators,
		&stats.ActiveCollaborators,
		&stats.AvgJobsPerCollab,
		&stats.AvgOnTimeDelivery,
		&stats.TotalCompletedMonth,
		&stats.AvgRating,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// UpdateCollaborator updates a collaborator's profile
func (r *Repository) UpdateCollaborator(ctx context.Context, collabID string, req *UpdateCollaboratorRequest) error {
	// First check if collaborator exists and has a profile
	var hasProfile bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM collaborator_profiles WHERE user_id = $1)
	`, collabID).Scan(&hasProfile)
	if err != nil {
		return err
	}

	if !hasProfile {
		// Create profile if it doesn't exist
		_, err = r.db.Exec(ctx, `
			INSERT INTO collaborator_profiles (user_id, specialty, pix_key, internal_ranking)
			VALUES ($1, $2, $3, COALESCE($4, 0))
		`, collabID, req.Specialty, req.PixKey, req.InternalRanking)
		return err
	}

	// Update existing profile
	query := `
		UPDATE collaborator_profiles
		SET
			specialty = COALESCE($2, specialty),
			pix_key = COALESCE($3, pix_key),
			internal_ranking = COALESCE($4, internal_ranking),
			updated_at = NOW()
		WHERE user_id = $1
	`
	_, err = r.db.Exec(ctx, query, collabID, req.Specialty, req.PixKey, req.InternalRanking)
	return err
}

// CreateCollaborator creates a new collaborator (user + profile) in a transaction
func (r *Repository) CreateCollaborator(ctx context.Context, name, email, passwordHash string, specialty, pixKey *string, internalRanking *float64) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert user with role COLLABORATOR
	var userID string
	err = tx.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, $3, 'COLLABORATOR')
		RETURNING id
	`, name, email, passwordHash).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("insert user: %w", err)
	}

	// Insert collaborator profile
	ranking := 0.0
	if internalRanking != nil {
		ranking = *internalRanking
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO collaborator_profiles (user_id, specialty, pix_key, internal_ranking)
		VALUES ($1, $2, $3, $4)
	`, userID, specialty, pixKey, ranking)
	if err != nil {
		return "", fmt.Errorf("insert collaborator_profile: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit transaction: %w", err)
	}

	return userID, nil
}

// EmailExists checks if an email is already registered
func (r *Repository) EmailExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
	`, email).Scan(&exists)
	return exists, err
}

// ListCollaboratorsPaginated returns paginated list of collaborators with optional filters
func (r *Repository) ListCollaboratorsPaginated(ctx context.Context, page, pageSize int, specialty string, minRating float64) (*CollaboratorsListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Build WHERE clause
	whereClause := "WHERE u.role = 'COLLABORATOR'"
	args := []interface{}{}
	argIndex := 1

	if specialty != "" {
		whereClause += fmt.Sprintf(" AND cp.specialty = $%d", argIndex)
		args = append(args, specialty)
		argIndex++
	}

	if minRating > 0 {
		whereClause += fmt.Sprintf(" AND COALESCE(rs.avg_rating, 0) >= $%d", argIndex)
		args = append(args, minRating)
		argIndex++
	}

	// Count total
	countQuery := fmt.Sprintf(`
		WITH rating_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(AVG(r.score), 0) as avg_rating
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT COUNT(*)
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN rating_stats rs ON rs.collaborator_id = u.id
		%s
	`, whereClause)

	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Add pagination args
	args = append(args, pageSize, offset)
	limitArg := argIndex
	offsetArg := argIndex + 1

	// Main query
	query := fmt.Sprintf(`
		WITH collab_stats AS (
			SELECT
				o.collaborator_id,
				COUNT(*) as total_jobs,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO') as completed_jobs,
				COUNT(*) FILTER (WHERE o.status NOT IN ('CONCLUIDO', 'CANCELADO')) as pending_jobs,
				COUNT(*) FILTER (WHERE o.status = 'ATRASADO') as delayed_jobs,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as total_earnings,
				COALESCE(SUM(CASE WHEN o.payment_status = 'LOCKED' THEN o.collab_value ELSE 0 END), 0) as pending_earnings,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO' AND o.due_date >= o.updated_at) as on_time_deliveries
			FROM orders o
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		),
		rating_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(AVG(r.score), 0) as avg_rating,
				COUNT(r.id) as total_ratings
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			u.email,
			cp.specialty,
			COALESCE(cp.internal_ranking, 0) as internal_ranking,
			COALESCE(cs.total_jobs, 0) as total_jobs,
			COALESCE(cs.completed_jobs, 0) as completed_jobs,
			COALESCE(cs.pending_jobs, 0) as pending_jobs,
			COALESCE(cs.delayed_jobs, 0) as delayed_jobs,
			COALESCE(cs.total_earnings, 0) as total_earnings,
			COALESCE(cs.pending_earnings, 0) as pending_earnings,
			COALESCE(rs.avg_rating, 0) as avg_rating,
			COALESCE(rs.total_ratings, 0) as total_ratings,
			CASE
				WHEN COALESCE(cs.completed_jobs, 0) = 0 THEN 0
				ELSE ROUND((COALESCE(cs.on_time_deliveries, 0)::numeric / cs.completed_jobs::numeric) * 100, 2)
			END as on_time_delivery_pct
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN collab_stats cs ON cs.collaborator_id = u.id
		LEFT JOIN rating_stats rs ON rs.collaborator_id = u.id
		%s
		ORDER BY COALESCE(cs.total_jobs, 0) DESC, u.name ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, limitArg, offsetArg)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collaborators []CollaboratorSummary
	for rows.Next() {
		var c CollaboratorSummary
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Email, &c.Specialty, &c.InternalRanking,
			&c.TotalJobs, &c.CompletedJobs, &c.PendingJobs, &c.DelayedJobs,
			&c.TotalEarnings, &c.PendingEarnings, &c.AvgRating, &c.TotalRatings,
			&c.OnTimeDeliveryPct,
		); err != nil {
			return nil, err
		}
		collaborators = append(collaborators, c)
	}

	if collaborators == nil {
		collaborators = []CollaboratorSummary{}
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &CollaboratorsListResponse{
		Collaborators: collaborators,
		Total:         total,
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetCollaboratorEarningsPeriodic returns earnings grouped by period
func (r *Repository) GetCollaboratorEarningsPeriodic(ctx context.Context, collabID string, months int) ([]CollaboratorEarningPeriod, error) {
	if months <= 0 {
		months = 6
	}

	query := `
		SELECT
			TO_CHAR(date_trunc('month', o.created_at), 'YYYY-MM') as period,
			COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as earned,
			COALESCE(SUM(CASE WHEN o.payment_status = 'REFUNDED' THEN o.collab_value ELSE 0 END), 0) as refunded,
			COUNT(*) as jobs
		FROM orders o
		WHERE o.collaborator_id = $1
			AND o.created_at >= date_trunc('month', NOW() - make_interval(months => $2))
		GROUP BY date_trunc('month', o.created_at)
		ORDER BY period ASC
	`

	rows, err := r.db.Query(ctx, query, collabID, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var periods []CollaboratorEarningPeriod
	for rows.Next() {
		var p CollaboratorEarningPeriod
		if err := rows.Scan(&p.Period, &p.Earned, &p.Refunded, &p.Jobs); err != nil {
			return nil, err
		}
		periods = append(periods, p)
	}

	if periods == nil {
		periods = []CollaboratorEarningPeriod{}
	}

	return periods, nil
}

// GetCollaboratorRevisionsPaginated returns paginated revisions for a collaborator
func (r *Repository) GetCollaboratorRevisionsPaginated(ctx context.Context, collabID string, page, pageSize int) (*CollaboratorRevisionsResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Count total
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM order_revisions rev
		JOIN orders o ON o.id = rev.order_id
		WHERE o.collaborator_id = $1
	`, collabID).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Get revisions
	query := `
		SELECT
			rev.id,
			rev.order_id,
			s.name as student_name,
			rev.reason,
			rev.created_at
		FROM order_revisions rev
		JOIN orders o ON o.id = rev.order_id
		JOIN users s ON s.id = o.student_id
		WHERE o.collaborator_id = $1
		ORDER BY rev.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, collabID, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []CollaboratorRevision
	for rows.Next() {
		var rev CollaboratorRevision
		if err := rows.Scan(&rev.ID, &rev.OrderID, &rev.StudentName, &rev.Reason, &rev.CreatedAt); err != nil {
			return nil, err
		}
		revisions = append(revisions, rev)
	}

	if revisions == nil {
		revisions = []CollaboratorRevision{}
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &CollaboratorRevisionsResponse{
		Revisions:  revisions,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetComplaintsPaginated returns paginated complaints with split values, stats and filters
func (r *Repository) GetComplaintsPaginated(ctx context.Context, page, pageSize int, status, collaboratorID, search string) (*ComplaintsListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Build WHERE clause
	whereClause := "WHERE pj.status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')"
	args := []interface{}{}
	argIndex := 1

	if status != "" {
		whereClause += fmt.Sprintf(" AND pj.status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	if collaboratorID != "" {
		whereClause += fmt.Sprintf(" AND pj.collaborator_id = $%d", argIndex)
		args = append(args, collaboratorID)
		argIndex++
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (st.name ILIKE $%d OR pj.title ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM production_jobs pj
		JOIN users st ON st.id = pj.student_id
		LEFT JOIN users col ON col.id = pj.collaborator_id
		%s
	`, whereClause)

	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Get stats
	stats, err := r.GetComplaintStats(ctx)
	if err != nil {
		return nil, err
	}

	// Add pagination args
	limitArg := argIndex
	offsetArg := argIndex + 1
	args = append(args, pageSize, offset)

	// Main query with split values
	query := fmt.Sprintf(`
		SELECT
			pj.id,
			st.name as student_name,
			st.email as student_email,
			COALESCE(pj.collaborator_id::text, '') as collaborator_id,
			COALESCE(col.name, 'Nao atribuido') as collaborator_name,
			pj.title as service_name,
			pj.status::text,
			pj.price as total_value,
			ROUND(pj.price * 0.6, 2) as collab_value,
			ROUND(pj.price * 0.4, 2) as company_value,
			pj.deadline as due_date,
			(SELECT COUNT(*) FROM job_histories jh WHERE jh.job_id = pj.id AND jh.new_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')) as revision_count,
			(SELECT jh.comments FROM job_histories jh WHERE jh.job_id = pj.id ORDER BY jh.created_at DESC LIMIT 1) as latest_reason,
			pj.updated_at as latest_revision_at,
			GREATEST(0, EXTRACT(DAY FROM NOW() - pj.updated_at)::int) as days_pending
		FROM production_jobs pj
		JOIN users st ON st.id = pj.student_id
		LEFT JOIN users col ON col.id = pj.collaborator_id
		%s
		ORDER BY
			CASE pj.status WHEN 'NAO_APROVADO' THEN 0 ELSE 1 END,
			pj.updated_at ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, limitArg, offsetArg)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var complaints []ComplaintWithSplit
	for rows.Next() {
		var c ComplaintWithSplit
		if err := rows.Scan(
			&c.ID,
			&c.StudentName,
			&c.StudentEmail,
			&c.CollaboratorID,
			&c.CollaboratorName,
			&c.ServiceName,
			&c.Status,
			&c.TotalValue,
			&c.CollabValue,
			&c.CompanyValue,
			&c.DueDate,
			&c.RevisionCount,
			&c.LatestReason,
			&c.LatestRevisionAt,
			&c.DaysPending,
		); err != nil {
			return nil, err
		}
		// Calculate priority based on days pending and revision count
		if c.DaysPending >= 7 || c.RevisionCount >= 3 {
			c.Priority = "HIGH"
		} else if c.DaysPending >= 3 || c.RevisionCount >= 2 {
			c.Priority = "MEDIUM"
		} else {
			c.Priority = "LOW"
		}
		complaints = append(complaints, c)
	}

	if complaints == nil {
		complaints = []ComplaintWithSplit{}
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &ComplaintsListResponse{
		Complaints: complaints,
		Stats:      *stats,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// GetComplaintStats returns aggregated complaint statistics
func (r *Repository) GetComplaintStats(ctx context.Context) (*ComplaintStats, error) {
	query := `
		WITH complaint_counts AS (
			SELECT
				COUNT(*) FILTER (WHERE status = 'AGUARDANDO_REVISAO') as total_aguardando,
				COUNT(*) FILTER (WHERE status = 'NAO_APROVADO') as total_nao_aprovado,
				COUNT(*) as total_complaints,
				COALESCE(AVG(EXTRACT(DAY FROM NOW() - updated_at)), 0) as avg_days_pending
			FROM production_jobs
			WHERE status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
		),
		resolved_counts AS (
			SELECT
				COUNT(*) FILTER (WHERE jh.created_at >= date_trunc('month', NOW())
					AND jh.previous_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
					AND jh.new_status IN ('EM_ANDAMENTO', 'APROVADO', 'CONCLUIDO')) as resolved_this_month,
				COUNT(*) FILTER (WHERE jh.created_at >= date_trunc('month', NOW() - interval '1 month')
					AND jh.created_at < date_trunc('month', NOW())
					AND jh.previous_status IN ('AGUARDANDO_REVISAO', 'NAO_APROVADO')
					AND jh.new_status IN ('EM_ANDAMENTO', 'APROVADO', 'CONCLUIDO')) as resolved_last_month
			FROM job_histories jh
		)
		SELECT
			cc.total_aguardando,
			cc.total_nao_aprovado,
			cc.total_complaints,
			ROUND(cc.avg_days_pending::numeric, 2),
			COALESCE(rc.resolved_this_month, 0),
			COALESCE(rc.resolved_last_month, 0)
		FROM complaint_counts cc, resolved_counts rc
	`

	var stats ComplaintStats
	err := r.db.QueryRow(ctx, query).Scan(
		&stats.TotalAguardandoRevisao,
		&stats.TotalNaoAprovado,
		&stats.TotalComplaints,
		&stats.AvgDaysPending,
		&stats.ResolvedThisMonth,
		&stats.ResolvedLastMonth,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// GetJobHistory returns the complete status history for a job
func (r *Repository) GetJobHistory(ctx context.Context, jobID string) ([]JobHistoryEntry, error) {
	query := `
		SELECT
			jh.id,
			jh.previous_status::text,
			jh.new_status::text,
			jh.comments,
			jh.changed_by_user_id,
			COALESCE(u.name, 'Sistema') as changed_by_name,
			COALESCE(u.role::text, 'SYSTEM') as changed_by_role,
			jh.created_at
		FROM job_histories jh
		LEFT JOIN users u ON u.id = jh.changed_by_user_id
		WHERE jh.job_id = $1
		ORDER BY jh.created_at DESC
	`

	rows, err := r.db.Query(ctx, query, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []JobHistoryEntry
	for rows.Next() {
		var h JobHistoryEntry
		if err := rows.Scan(
			&h.ID,
			&h.PreviousStatus,
			&h.NewStatus,
			&h.Comments,
			&h.ChangedByID,
			&h.ChangedByName,
			&h.ChangedByRole,
			&h.CreatedAt,
		); err != nil {
			return nil, err
		}
		history = append(history, h)
	}

	if history == nil {
		history = []JobHistoryEntry{}
	}

	return history, nil
}

// UpdateJobStatus changes the status of a job and records it in history
func (r *Repository) UpdateJobStatus(ctx context.Context, jobID, userID string, req *UpdateJobStatusRequest) error {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get current status
	var currentStatus string
	err = tx.QueryRow(ctx, `
		SELECT status::text FROM production_jobs WHERE id = $1
	`, jobID).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("job not found")
		}
		return err
	}

	// Update job status
	_, err = tx.Exec(ctx, `
		UPDATE production_jobs
		SET status = $1::production_job_status, updated_at = NOW()
		WHERE id = $2
	`, req.Status, jobID)
	if err != nil {
		return err
	}

	// Insert history record
	_, err = tx.Exec(ctx, `
		INSERT INTO job_histories (job_id, previous_status, new_status, changed_by_user_id, comments)
		VALUES ($1, $2::production_job_status, $3::production_job_status, $4, $5)
	`, jobID, currentStatus, req.Status, userID, req.Comments)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetCollaboratorRankingPositions returns a collaborator's position in all 5 rankings
func (r *Repository) GetCollaboratorRankingPositions(ctx context.Context, collabID string) (*CollaboratorRankingPositions, error) {
	result := &CollaboratorRankingPositions{
		CollaboratorID: collabID,
	}

	// Production ranking (completed jobs count)
	productionQuery := `
		WITH ranking AS (
			SELECT
				pj.collaborator_id,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') as value,
				ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') DESC) as position
			FROM users u
			LEFT JOIN production_jobs pj ON pj.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
			GROUP BY pj.collaborator_id, u.id
		),
		total AS (SELECT COUNT(*) as cnt FROM users WHERE role = 'COLLABORATOR')
		SELECT r.position, r.value, t.cnt
		FROM ranking r, total t
		WHERE r.collaborator_id = $1
	`
	var prodPos RankingPosition
	err := r.db.QueryRow(ctx, productionQuery, collabID).Scan(&prodPos.Position, &prodPos.Value, &prodPos.Total)
	if err == nil {
		result.Production = &prodPos
	}

	// Revenue ranking (total earnings)
	revenueQuery := `
		WITH ranking AS (
			SELECT
				o.collaborator_id,
				COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) as value,
				ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN o.payment_status = 'RELEASED' THEN o.collab_value ELSE 0 END), 0) DESC) as position
			FROM users u
			LEFT JOIN orders o ON o.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
			GROUP BY o.collaborator_id, u.id
		),
		total AS (SELECT COUNT(*) as cnt FROM users WHERE role = 'COLLABORATOR')
		SELECT r.position, r.value, t.cnt
		FROM ranking r, total t
		WHERE r.collaborator_id = $1
	`
	var revPos RankingPosition
	err = r.db.QueryRow(ctx, revenueQuery, collabID).Scan(&revPos.Position, &revPos.Value, &revPos.Total)
	if err == nil {
		result.Revenue = &revPos
	}

	// Punctuality ranking (on-time delivery percentage)
	punctualityQuery := `
		WITH stats AS (
			SELECT
				u.id as collaborator_id,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO') as total_completed,
				COUNT(*) FILTER (WHERE pj.status = 'CONCLUIDO' AND pj.deadline >= pj.updated_at) as on_time
			FROM users u
			LEFT JOIN production_jobs pj ON pj.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id
		),
		ranking AS (
			SELECT
				collaborator_id,
				CASE WHEN total_completed > 0 THEN ROUND((on_time::numeric / total_completed::numeric) * 100, 2) ELSE 0 END as value,
				ROW_NUMBER() OVER (ORDER BY CASE WHEN total_completed > 0 THEN (on_time::numeric / total_completed::numeric) ELSE 0 END DESC) as position
			FROM stats
			WHERE total_completed >= 3
		),
		total AS (SELECT COUNT(*) as cnt FROM stats WHERE total_completed >= 3)
		SELECT r.position, r.value, t.cnt
		FROM ranking r, total t
		WHERE r.collaborator_id = $1
	`
	var punctPos RankingPosition
	err = r.db.QueryRow(ctx, punctualityQuery, collabID).Scan(&punctPos.Position, &punctPos.Value, &punctPos.Total)
	if err == nil {
		result.Punctuality = &punctPos
	}

	// Satisfaction ranking (average rating)
	satisfactionQuery := `
		WITH stats AS (
			SELECT
				u.id as collaborator_id,
				COALESCE(AVG(rt.score), 0) as avg_rating,
				COUNT(rt.id) as total_ratings
			FROM users u
			LEFT JOIN ratings rt ON rt.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id
		),
		ranking AS (
			SELECT
				collaborator_id,
				avg_rating as value,
				ROW_NUMBER() OVER (ORDER BY avg_rating DESC) as position
			FROM stats
			WHERE total_ratings >= 3
		),
		total AS (SELECT COUNT(*) as cnt FROM stats WHERE total_ratings >= 3)
		SELECT r.position, r.value, t.cnt
		FROM ranking r, total t
		WHERE r.collaborator_id = $1
	`
	var satPos RankingPosition
	err = r.db.QueryRow(ctx, satisfactionQuery, collabID).Scan(&satPos.Position, &satPos.Value, &satPos.Total)
	if err == nil {
		result.Satisfaction = &satPos
	}

	// Quality ranking (internal ranking score)
	qualityQuery := `
		WITH ranking AS (
			SELECT
				u.id as collaborator_id,
				COALESCE(cp.internal_ranking, 0) as value,
				ROW_NUMBER() OVER (ORDER BY COALESCE(cp.internal_ranking, 0) DESC) as position
			FROM users u
			LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
			WHERE u.role = 'COLLABORATOR'
		),
		total AS (SELECT COUNT(*) as cnt FROM users WHERE role = 'COLLABORATOR')
		SELECT r.position, r.value, t.cnt
		FROM ranking r, total t
		WHERE r.collaborator_id = $1
	`
	var qualPos RankingPosition
	err = r.db.QueryRow(ctx, qualityQuery, collabID).Scan(&qualPos.Position, &qualPos.Value, &qualPos.Total)
	if err == nil {
		result.Quality = &qualPos
	}

	return result, nil
}

// GetDelinquentsByCollaborator returns delinquent students who have orders with this collaborator
func (r *Repository) GetDelinquentsByCollaborator(ctx context.Context, collabID string) (*CollaboratorDelinquentsResponse, error) {
	query := `
		SELECT
			u.id as student_id,
			u.name as student_name,
			u.email as student_email,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			EXTRACT(DAY FROM NOW() - MIN(o.due_date))::int as days_overdue,
			COUNT(o.id) as overdue_orders,
			MIN(o.due_date) as oldest_due_date
		FROM users u
		INNER JOIN orders o ON o.student_id = u.id
		WHERE u.is_delinquent = TRUE
		  AND o.collaborator_id = $1
		  AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
		  AND o.payment_status = 'LOCKED'
		  AND o.due_date < NOW()
		GROUP BY u.id, u.name, u.email
		ORDER BY total_owed DESC
	`

	rows, err := r.db.Query(ctx, query, collabID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var delinquents []CollaboratorDelinquent
	var totalOwed float64
	for rows.Next() {
		var d CollaboratorDelinquent
		if err := rows.Scan(
			&d.StudentID,
			&d.StudentName,
			&d.StudentEmail,
			&d.TotalOwed,
			&d.DaysOverdue,
			&d.OverdueOrders,
			&d.OldestDueDate,
		); err != nil {
			return nil, err
		}
		delinquents = append(delinquents, d)
		totalOwed += d.TotalOwed
	}

	if delinquents == nil {
		delinquents = []CollaboratorDelinquent{}
	}

	return &CollaboratorDelinquentsResponse{
		Delinquents: delinquents,
		TotalCount:  len(delinquents),
		TotalOwed:   totalOwed,
	}, nil
}

// GetPendingFinancials returns pending financial summary with breakdown by status
func (r *Repository) GetPendingFinancials(ctx context.Context) (*PendingFinancialsReport, error) {
	report := &PendingFinancialsReport{
		ByPaymentStatus: make(map[string]StatusBreakdown),
		ByOrderStatus:   make(map[string]StatusBreakdown),
	}

	// Query for breakdown by payment_status
	paymentStatusQuery := `
		SELECT
			payment_status,
			COUNT(*) as count,
			COALESCE(SUM(total_value), 0) as amount
		FROM orders
		WHERE status NOT IN ('CONCLUIDO', 'CANCELADO')
		GROUP BY payment_status
	`

	rows, err := r.db.Query(ctx, paymentStatusQuery)
	if err != nil {
		return nil, fmt.Errorf("query payment status: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var breakdown StatusBreakdown
		if err := rows.Scan(&status, &breakdown.Count, &breakdown.Amount); err != nil {
			return nil, fmt.Errorf("scan payment status: %w", err)
		}
		report.ByPaymentStatus[status] = breakdown
		report.TotalPendingCount += breakdown.Count
		report.TotalPendingAmount += breakdown.Amount
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Query for breakdown by order_status
	orderStatusQuery := `
		SELECT
			status,
			COUNT(*) as count,
			COALESCE(SUM(total_value), 0) as amount
		FROM orders
		WHERE status NOT IN ('CONCLUIDO', 'CANCELADO')
		GROUP BY status
	`

	rows2, err := r.db.Query(ctx, orderStatusQuery)
	if err != nil {
		return nil, fmt.Errorf("query order status: %w", err)
	}
	defer rows2.Close()

	for rows2.Next() {
		var status string
		var breakdown StatusBreakdown
		if err := rows2.Scan(&status, &breakdown.Count, &breakdown.Amount); err != nil {
			return nil, fmt.Errorf("scan order status: %w", err)
		}
		report.ByOrderStatus[status] = breakdown
	}
	if err := rows2.Err(); err != nil {
		return nil, err
	}

	return report, nil
}

// ListCollaboratorsForSelection returns a simplified list of collaborators for dropdown selection
func (r *Repository) ListCollaboratorsForSelection(ctx context.Context) ([]CollaboratorForSelection, error) {
	query := `
		WITH rating_stats AS (
			SELECT
				o.collaborator_id,
				COALESCE(AVG(r.score), 0) as avg_rating
			FROM orders o
			LEFT JOIN ratings r ON r.order_id = o.id
			WHERE o.collaborator_id IS NOT NULL
			GROUP BY o.collaborator_id
		)
		SELECT
			u.id,
			u.name,
			cp.specialty,
			COALESCE(rs.avg_rating, 0) as avg_rating
		FROM users u
		LEFT JOIN collaborator_profiles cp ON cp.user_id = u.id
		LEFT JOIN rating_stats rs ON rs.collaborator_id = u.id
		WHERE u.role = 'COLLABORATOR'
		ORDER BY u.name ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collaborators []CollaboratorForSelection
	for rows.Next() {
		var c CollaboratorForSelection
		if err := rows.Scan(&c.ID, &c.Name, &c.Specialty, &c.AvgRating); err != nil {
			return nil, err
		}
		collaborators = append(collaborators, c)
	}

	if collaborators == nil {
		collaborators = []CollaboratorForSelection{}
	}

	return collaborators, nil
}

// GetDelinquencyHistory returns the complete delinquency history for a user
func (r *Repository) GetDelinquencyHistory(ctx context.Context, userID string) (*DelinquencyHistoryResponse, error) {
	// Get user info
	var response DelinquencyHistoryResponse
	response.UserID = userID

	userQuery := `
		SELECT name, email, is_delinquent
		FROM users
		WHERE id = $1
	`
	err := r.db.QueryRow(ctx, userQuery, userID).Scan(
		&response.UserName,
		&response.UserEmail,
		&response.IsCurrentlyDelinquent,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found: %s", userID)
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	// Get delinquency history entries
	historyQuery := `
		SELECT
			id,
			user_id,
			started_at,
			ended_at,
			total_owed_at_start,
			total_owed_at_end,
			triggering_order_ids,
			resolution_type,
			notes,
			CASE
				WHEN ended_at IS NOT NULL THEN EXTRACT(DAY FROM ended_at - started_at)::int
				ELSE EXTRACT(DAY FROM NOW() - started_at)::int
			END as duration_days,
			created_at
		FROM delinquency_history
		WHERE user_id = $1
		ORDER BY started_at DESC
	`

	rows, err := r.db.Query(ctx, historyQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	var totalDays int
	for rows.Next() {
		var entry DelinquencyHistoryEntry
		if err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.StartedAt,
			&entry.EndedAt,
			&entry.TotalOwedAtStart,
			&entry.TotalOwedAtEnd,
			&entry.TriggeringOrderIDs,
			&entry.ResolutionType,
			&entry.Notes,
			&entry.DurationDays,
			&entry.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan history entry: %w", err)
		}
		response.History = append(response.History, entry)
		totalDays += entry.DurationDays
	}

	if response.History == nil {
		response.History = []DelinquencyHistoryEntry{}
	}

	response.TotalPeriods = len(response.History)
	response.TotalDaysDelinquent = totalDays

	return &response, nil
}

// StreamDelinquentUsersWithHistory returns delinquent users with CPF and history count
func (r *Repository) StreamDelinquentUsersWithHistory(ctx context.Context, fn func(DelinquentUserWithHistory) error) error {
	query := `
		WITH history_stats AS (
			SELECT
				user_id,
				COUNT(*) as previous_periods,
				COALESCE(SUM(
					CASE
						WHEN ended_at IS NOT NULL THEN EXTRACT(DAY FROM ended_at - started_at)::int
						ELSE 0
					END
				), 0) as past_days
			FROM delinquency_history
			WHERE ended_at IS NOT NULL
			GROUP BY user_id
		)
		SELECT
			u.id,
			u.name,
			u.email,
			COALESCE(SUM(o.total_value), 0) as total_owed,
			MIN(o.due_date) as oldest_due_date,
			EXTRACT(DAY FROM NOW() - MIN(o.due_date))::int as days_overdue,
			COUNT(o.id) as overdue_orders,
			u.delinquent_since,
			u.cpf,
			u.phone,
			COALESCE(hs.previous_periods, 0) as previous_periods,
			COALESCE(hs.past_days, 0) + EXTRACT(DAY FROM NOW() - u.delinquent_since)::int as total_days_ever
		FROM users u
		INNER JOIN orders o ON o.student_id = u.id
		LEFT JOIN history_stats hs ON hs.user_id = u.id
		WHERE u.is_delinquent = TRUE
		  AND o.status NOT IN ('CONCLUIDO', 'CANCELADO')
		  AND o.payment_status = 'LOCKED'
		  AND o.due_date < NOW()
		GROUP BY u.id, u.name, u.email, u.delinquent_since, u.cpf, u.phone, hs.previous_periods, hs.past_days
		ORDER BY total_owed DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var du DelinquentUserWithHistory
		var delinquentSince *time.Time
		if err := rows.Scan(
			&du.ID,
			&du.Name,
			&du.Email,
			&du.TotalOwed,
			&du.OldestDueDate,
			&du.DaysOverdue,
			&du.OverdueOrders,
			&delinquentSince,
			&du.CPF,
			&du.Phone,
			&du.PreviousPeriods,
			&du.TotalDaysEver,
		); err != nil {
			return err
		}
		if delinquentSince != nil {
			du.DelinquentSince = *delinquentSince
		}
		if err := fn(du); err != nil {
			return err
		}
	}
	return rows.Err()
}

// GetPendingWithdrawalsSummary returns aggregated payout counts and amounts by status
func (r *Repository) GetPendingWithdrawalsSummary(ctx context.Context) (*PendingWithdrawalsSummary, error) {
	query := `
		SELECT
			COALESCE(COUNT(*) FILTER (WHERE status = 'PENDING'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'PENDING'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'APPROVED'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'APPROVED'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'PROCESSING'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'PROCESSING'), 0)
		FROM payouts
		WHERE status IN ('PENDING', 'APPROVED', 'PROCESSING')
	`

	var s PendingWithdrawalsSummary
	err := r.db.QueryRow(ctx, query).Scan(
		&s.PendingCount,
		&s.PendingAmount,
		&s.ApprovedCount,
		&s.ApprovedAmount,
		&s.ProcessingCount,
		&s.ProcessingAmount,
	)
	if err != nil {
		return nil, fmt.Errorf("get pending withdrawals summary: %w", err)
	}
	return &s, nil
}

// GetOpenChargesSummary returns aggregated charge counts and amounts by status
func (r *Repository) GetOpenChargesSummary(ctx context.Context) (*OpenChargesSummary, error) {
	query := `
		SELECT
			COALESCE(COUNT(*) FILTER (WHERE status = 'PENDING'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'PENDING'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'OVERDUE'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'OVERDUE'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'CONFIRMED'), 0),
			COALESCE(SUM(value) FILTER (WHERE status = 'CONFIRMED'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status IN ('PENDING', 'OVERDUE', 'CONFIRMED')), 0),
			COALESCE(SUM(value) FILTER (WHERE status IN ('PENDING', 'OVERDUE', 'CONFIRMED')), 0)
		FROM charges
		WHERE status IN ('PENDING', 'OVERDUE', 'CONFIRMED')
	`

	var s OpenChargesSummary
	err := r.db.QueryRow(ctx, query).Scan(
		&s.PendingCount,
		&s.PendingAmount,
		&s.OverdueCount,
		&s.OverdueAmount,
		&s.ConfirmedCount,
		&s.ConfirmedAmount,
		&s.TotalOpenCount,
		&s.TotalOpenAmount,
	)
	if err != nil {
		return nil, fmt.Errorf("get open charges summary: %w", err)
	}
	return &s, nil
}
