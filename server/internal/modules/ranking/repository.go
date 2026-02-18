package ranking

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetProductivityRanking returns ranking by completed orders count
func (r *Repository) GetProductivityRanking(ctx context.Context, period RankingPeriod, userID string) ([]RankingEntry, error) {
	query := `
		WITH ranking AS (
			SELECT
				u.id as collaborator_id,
				u.name,
				COUNT(o.id) as value,
				COUNT(o.id) as orders_count,
				ROW_NUMBER() OVER (ORDER BY COUNT(o.id) DESC, u.created_at ASC) as position
			FROM users u
			LEFT JOIN orders o ON o.collaborator_id = u.id
				AND o.status = 'CONCLUIDO'
				AND ($1 = 'all_time' OR o.created_at >= date_trunc('month', NOW()))
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id, u.name, u.created_at
		)
		SELECT position, collaborator_id, name, value, orders_count
		FROM ranking
		WHERE position <= 10
		   OR collaborator_id = $2
		ORDER BY position
	`

	return r.scanRankingEntries(ctx, query, string(period), userID)
}

// GetRevenueRanking returns ranking by total collaborator earnings
func (r *Repository) GetRevenueRanking(ctx context.Context, period RankingPeriod, userID string) ([]RankingEntry, error) {
	query := `
		WITH ranking AS (
			SELECT
				u.id as collaborator_id,
				u.name,
				COALESCE(SUM(o.collab_value), 0) as value,
				COUNT(o.id) as orders_count,
				ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(o.collab_value), 0) DESC, COUNT(o.id) DESC) as position
			FROM users u
			LEFT JOIN orders o ON o.collaborator_id = u.id
				AND o.status = 'CONCLUIDO'
				AND o.payment_status = 'RELEASED'
				AND ($1 = 'all_time' OR o.created_at >= date_trunc('month', NOW()))
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id, u.name
		)
		SELECT position, collaborator_id, name, value, orders_count
		FROM ranking
		WHERE position <= 10
		   OR collaborator_id = $2
		ORDER BY position
	`

	return r.scanRankingEntries(ctx, query, string(period), userID)
}

// GetPunctualityRanking returns ranking by percentage of on-time deliveries
func (r *Repository) GetPunctualityRanking(ctx context.Context, period RankingPeriod, userID string) ([]RankingEntry, error) {
	query := `
		WITH stats AS (
			SELECT
				u.id as collaborator_id,
				u.name,
				COUNT(o.id) FILTER (WHERE o.status = 'CONCLUIDO') as total_delivered,
				COUNT(o.id) FILTER (WHERE o.status = 'CONCLUIDO'
					AND EXISTS (
						SELECT 1 FROM deliveries d
						WHERE d.order_id = o.id
						AND d.created_at <= o.due_date
					)) as on_time
			FROM users u
			LEFT JOIN orders o ON o.collaborator_id = u.id
				AND ($1 = 'all_time' OR o.created_at >= date_trunc('month', NOW()))
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id, u.name
		),
		ranking AS (
			SELECT
				collaborator_id,
				name,
				CASE WHEN total_delivered > 0
					THEN (on_time::float / total_delivered * 100)
					ELSE 0 END as value,
				total_delivered as orders_count,
				ROW_NUMBER() OVER (
					ORDER BY
						CASE WHEN total_delivered > 0
							THEN (on_time::float / total_delivered * 100)
							ELSE 0 END DESC,
						total_delivered DESC
				) as position
			FROM stats
			WHERE total_delivered > 0
		)
		SELECT position, collaborator_id, name, value, orders_count
		FROM ranking
		WHERE position <= 10
		   OR collaborator_id = $2
		ORDER BY position
	`

	return r.scanRankingEntries(ctx, query, string(period), userID)
}

// GetSatisfactionRanking returns ranking by average rating score
func (r *Repository) GetSatisfactionRanking(ctx context.Context, period RankingPeriod, userID string) ([]RankingEntry, error) {
	query := `
		WITH ranking AS (
			SELECT
				u.id as collaborator_id,
				u.name,
				COALESCE(AVG(rt.score), 0) as value,
				COUNT(rt.id) as orders_count,
				ROW_NUMBER() OVER (
					ORDER BY COALESCE(AVG(rt.score), 0) DESC, COUNT(rt.id) DESC
				) as position
			FROM users u
			LEFT JOIN ratings rt ON rt.collaborator_id = u.id
				AND ($1 = 'all_time' OR rt.created_at >= date_trunc('month', NOW()))
			WHERE u.role = 'COLLABORATOR'
			GROUP BY u.id, u.name
			HAVING COUNT(rt.id) > 0
		)
		SELECT position, collaborator_id, name, value, orders_count
		FROM ranking
		WHERE position <= 10
		   OR collaborator_id = $2
		ORDER BY position
	`

	return r.scanRankingEntries(ctx, query, string(period), userID)
}

// GetQualityRanking returns ranking by automatic quality score
// Formula: 50% low revision rate + 30% low refund rate + 20% first-time approval rate
func (r *Repository) GetQualityRanking(ctx context.Context, period RankingPeriod, userID string) ([]RankingEntry, error) {
	query := `
		WITH quality_stats AS (
			SELECT
				o.collaborator_id,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO') as completed,
				COUNT(*) FILTER (WHERE o.payment_status = 'REFUNDED') as refunds,
				COALESCE((
					SELECT COUNT(*)
					FROM order_revisions r
					JOIN orders o2 ON o2.id = r.order_id
					WHERE o2.collaborator_id = o.collaborator_id
						AND ($1 = 'all_time' OR o2.created_at >= date_trunc('month', NOW()))
				), 0) as total_revisions,
				COUNT(*) FILTER (WHERE o.status = 'CONCLUIDO'
					AND NOT EXISTS (SELECT 1 FROM order_revisions r WHERE r.order_id = o.id)
				) as first_time_approvals
			FROM orders o
			WHERE o.collaborator_id IS NOT NULL
				AND ($1 = 'all_time' OR o.created_at >= date_trunc('month', NOW()))
			GROUP BY o.collaborator_id
		),
		ranking AS (
			SELECT
				u.id as collaborator_id,
				u.name,
				CASE
					WHEN COALESCE(qs.completed, 0) < 3 THEN 0
					ELSE ROUND((
						(1 - LEAST(COALESCE(qs.total_revisions, 0)::numeric / GREATEST(qs.completed, 1)::numeric, 1)) * 0.5 +
						(1 - LEAST(COALESCE(qs.refunds, 0)::numeric / GREATEST(qs.completed, 1)::numeric, 1)) * 0.3 +
						(COALESCE(qs.first_time_approvals, 0)::numeric / GREATEST(qs.completed, 1)::numeric) * 0.2
					) * 100, 2)
				END as value,
				COALESCE(qs.completed, 0) as orders_count,
				ROW_NUMBER() OVER (
					ORDER BY
						CASE
							WHEN COALESCE(qs.completed, 0) < 3 THEN 0
							ELSE ROUND((
								(1 - LEAST(COALESCE(qs.total_revisions, 0)::numeric / GREATEST(qs.completed, 1)::numeric, 1)) * 0.5 +
								(1 - LEAST(COALESCE(qs.refunds, 0)::numeric / GREATEST(qs.completed, 1)::numeric, 1)) * 0.3 +
								(COALESCE(qs.first_time_approvals, 0)::numeric / GREATEST(qs.completed, 1)::numeric) * 0.2
							) * 100, 2)
						END DESC,
						COALESCE(qs.completed, 0) DESC
				) as position
			FROM users u
			LEFT JOIN quality_stats qs ON qs.collaborator_id = u.id
			WHERE u.role = 'COLLABORATOR'
				AND COALESCE(qs.completed, 0) >= 3
		)
		SELECT position, collaborator_id, name, value, orders_count
		FROM ranking
		WHERE position <= 10
		   OR collaborator_id = $2
		ORDER BY position
	`

	return r.scanRankingEntries(ctx, query, string(period), userID)
}

// CountCollaborators returns total count of collaborators
func (r *Repository) CountCollaborators(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = 'COLLABORATOR'`).Scan(&count)
	return count, err
}

// CreateRating inserts a new rating for an order
func (r *Repository) CreateRating(ctx context.Context, input CreateRatingInput) (*Rating, error) {
	query := `
		INSERT INTO ratings (order_id, student_id, collaborator_id, score, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_id, student_id, collaborator_id, score, comment, created_at
	`

	var rating Rating
	err := r.db.QueryRow(ctx, query,
		input.OrderID,
		input.StudentID,
		input.CollaboratorID,
		input.Score,
		input.Comment,
	).Scan(
		&rating.ID,
		&rating.OrderID,
		&rating.StudentID,
		&rating.CollaboratorID,
		&rating.Score,
		&rating.Comment,
		&rating.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rating, nil
}

// GetRatingByOrderID returns the rating for a specific order
func (r *Repository) GetRatingByOrderID(ctx context.Context, orderID string) (*Rating, error) {
	query := `
		SELECT id, order_id, student_id, collaborator_id, score, comment, created_at
		FROM ratings
		WHERE order_id = $1
	`

	var rating Rating
	err := r.db.QueryRow(ctx, query, orderID).Scan(
		&rating.ID,
		&rating.OrderID,
		&rating.StudentID,
		&rating.CollaboratorID,
		&rating.Score,
		&rating.Comment,
		&rating.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rating, nil
}

// scanRankingEntries is a helper to scan ranking query results
func (r *Repository) scanRankingEntries(ctx context.Context, query string, period string, userID string) ([]RankingEntry, error) {
	rows, err := r.db.Query(ctx, query, period, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []RankingEntry
	for rows.Next() {
		var e RankingEntry
		if err := rows.Scan(
			&e.Position,
			&e.CollaboratorID,
			&e.Name,
			&e.Value,
			&e.OrdersCount,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
