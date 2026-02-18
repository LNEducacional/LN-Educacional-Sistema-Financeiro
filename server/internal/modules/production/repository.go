package production

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create inserts a new production job
func (r *Repository) Create(ctx context.Context, job *ProductionJob) error {
	query := `
		INSERT INTO production_jobs (title, description, price, deadline, status, student_id, collaborator_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		job.Title,
		job.Description,
		job.Price,
		job.Deadline,
		job.Status,
		job.StudentID,
		job.CollaboratorID,
	).Scan(&job.ID, &job.CreatedAt, &job.UpdatedAt)
}

// GetByID retrieves a production job by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		WHERE id = $1
	`
	var job ProductionJob
	err := r.db.QueryRow(ctx, query, id).Scan(
		&job.ID, &job.Title, &job.Description, &job.Price, &job.Deadline, &job.Status,
		&job.StudentID, &job.CollaboratorID, &job.FinancialTransactionID,
		&job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	return &job, nil
}

// GetByIDTx retrieves a production job by ID within a transaction (with row lock)
func (r *Repository) GetByIDTx(ctx context.Context, tx pgx.Tx, id string) (*ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		WHERE id = $1
		FOR UPDATE
	`
	var job ProductionJob
	err := tx.QueryRow(ctx, query, id).Scan(
		&job.ID, &job.Title, &job.Description, &job.Price, &job.Deadline, &job.Status,
		&job.StudentID, &job.CollaboratorID, &job.FinancialTransactionID,
		&job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	return &job, nil
}

// List retrieves all production jobs with optional filters
func (r *Repository) List(ctx context.Context, filters ListFilters) ([]ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, query, filters.Limit, filters.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanJobs(rows)
}

// ListByStudentID retrieves all jobs for a student
func (r *Repository) ListByStudentID(ctx context.Context, studentID string) ([]ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		WHERE student_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanJobs(rows)
}

// ListByCollaboratorID retrieves all jobs for a collaborator
func (r *Repository) ListByCollaboratorID(ctx context.Context, collaboratorID string) ([]ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		WHERE collaborator_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, collaboratorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanJobs(rows)
}

// UpdateStatusTx updates the status of a production job within a transaction
func (r *Repository) UpdateStatusTx(ctx context.Context, tx pgx.Tx, id string, status ProductionJobStatus) error {
	query := `
		UPDATE production_jobs
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, id, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrJobNotFound
	}
	return nil
}

// SetFinancialTransactionIDTx links a financial transaction to a job
func (r *Repository) SetFinancialTransactionIDTx(ctx context.Context, tx pgx.Tx, jobID, txID string) error {
	query := `
		UPDATE production_jobs
		SET financial_transaction_id = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, jobID, txID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrJobNotFound
	}
	return nil
}

// AssignCollaboratorTx assigns a collaborator to a job
func (r *Repository) AssignCollaboratorTx(ctx context.Context, tx pgx.Tx, jobID, collaboratorID string) error {
	query := `
		UPDATE production_jobs
		SET collaborator_id = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, jobID, collaboratorID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrJobNotFound
	}
	return nil
}

// CreateHistory inserts a new job history record
func (r *Repository) CreateHistory(ctx context.Context, h *JobHistory) error {
	query := `
		INSERT INTO job_histories (job_id, previous_status, new_status, changed_by_user_id, comments)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		h.JobID,
		h.PreviousStatus,
		h.NewStatus,
		h.ChangedByUserID,
		h.Comments,
	).Scan(&h.ID, &h.CreatedAt)
}

// CreateHistoryTx inserts a new job history record within a transaction
func (r *Repository) CreateHistoryTx(ctx context.Context, tx pgx.Tx, h *JobHistory) error {
	query := `
		INSERT INTO job_histories (job_id, previous_status, new_status, changed_by_user_id, comments)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return tx.QueryRow(ctx, query,
		h.JobID,
		h.PreviousStatus,
		h.NewStatus,
		h.ChangedByUserID,
		h.Comments,
	).Scan(&h.ID, &h.CreatedAt)
}

// GetHistoryByJobID retrieves all history records for a job
func (r *Repository) GetHistoryByJobID(ctx context.Context, jobID string) ([]JobHistory, error) {
	query := `
		SELECT id, job_id, previous_status, new_status, changed_by_user_id, comments, created_at
		FROM job_histories
		WHERE job_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var histories []JobHistory
	for rows.Next() {
		var h JobHistory
		err := rows.Scan(
			&h.ID, &h.JobID, &h.PreviousStatus, &h.NewStatus,
			&h.ChangedByUserID, &h.Comments, &h.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		histories = append(histories, h)
	}
	return histories, nil
}

// GetDelayedJobs retrieves jobs that are past deadline and not completed
func (r *Repository) GetDelayedJobs(ctx context.Context) ([]ProductionJob, error) {
	query := `
		SELECT id, title, description, price, deadline, status,
		       student_id, collaborator_id, financial_transaction_id,
		       created_at, updated_at
		FROM production_jobs
		WHERE deadline < NOW() AT TIME ZONE 'UTC'
		  AND status NOT IN ('CONCLUIDO', 'NAO_APROVADO')
		ORDER BY deadline ASC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanJobs(rows)
}

// CountByCollaboratorAndStatus counts jobs by collaborator and status
func (r *Repository) CountByCollaboratorAndStatus(ctx context.Context, collaboratorID string, status ProductionJobStatus) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM production_jobs
		WHERE collaborator_id = $1 AND status = $2
	`
	var count int
	err := r.db.QueryRow(ctx, query, collaboratorID, status).Scan(&count)
	return count, err
}

// CountDelayedDeliveries counts jobs delivered after deadline for a collaborator
func (r *Repository) CountDelayedDeliveries(ctx context.Context, collaboratorID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM production_jobs
		WHERE collaborator_id = $1
		  AND status IN ('APROVADO', 'CONCLUIDO')
		  AND updated_at > deadline
	`
	var count int
	err := r.db.QueryRow(ctx, query, collaboratorID).Scan(&count)
	return count, err
}

// Helper function to scan job rows
func scanJobs(rows pgx.Rows) ([]ProductionJob, error) {
	var jobs []ProductionJob
	for rows.Next() {
		var job ProductionJob
		err := rows.Scan(
			&job.ID, &job.Title, &job.Description, &job.Price, &job.Deadline, &job.Status,
			&job.StudentID, &job.CollaboratorID, &job.FinancialTransactionID,
			&job.CreatedAt, &job.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}
	return jobs, nil
}

// ListFilters defines pagination filters
type ListFilters struct {
	Limit  int
	Offset int
}
