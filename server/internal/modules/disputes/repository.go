package disputes

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDisputeNotFound = errors.New("disputa não encontrada")
	ErrCommentNotFound = errors.New("comentário não encontrado")
)

// Repository encapsula operações de banco de dados para disputas
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository cria uma nova instância de Repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateDispute cria uma nova disputa
func (r *Repository) CreateDispute(ctx context.Context, req *CreateDisputeRequest, userID, userRole string) (*Dispute, error) {
	query := `
		INSERT INTO disputes (order_id, opened_by_user_id, opened_by_role, title, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_id, opened_by_user_id, opened_by_role, status, title, description,
		          resolution, resolution_notes, resolved_by_admin_id, resolved_at, created_at, updated_at
	`

	var dispute Dispute
	err := r.db.QueryRow(ctx, query,
		req.OrderID,
		userID,
		userRole,
		req.Title,
		req.Description,
	).Scan(
		&dispute.ID,
		&dispute.OrderID,
		&dispute.OpenedByUserID,
		&dispute.OpenedByRole,
		&dispute.Status,
		&dispute.Title,
		&dispute.Description,
		&dispute.Resolution,
		&dispute.ResolutionNotes,
		&dispute.ResolvedByAdminID,
		&dispute.ResolvedAt,
		&dispute.CreatedAt,
		&dispute.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create dispute: %w", err)
	}

	return &dispute, nil
}

// GetByID busca uma disputa por ID
func (r *Repository) GetByID(ctx context.Context, id string) (*Dispute, error) {
	query := `
		SELECT id, order_id, opened_by_user_id, opened_by_role, status, title, description,
		       resolution, resolution_notes, resolved_by_admin_id, resolved_at, created_at, updated_at
		FROM disputes
		WHERE id = $1
	`

	var dispute Dispute
	err := r.db.QueryRow(ctx, query, id).Scan(
		&dispute.ID,
		&dispute.OrderID,
		&dispute.OpenedByUserID,
		&dispute.OpenedByRole,
		&dispute.Status,
		&dispute.Title,
		&dispute.Description,
		&dispute.Resolution,
		&dispute.ResolutionNotes,
		&dispute.ResolvedByAdminID,
		&dispute.ResolvedAt,
		&dispute.CreatedAt,
		&dispute.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDisputeNotFound
		}
		return nil, fmt.Errorf("get dispute by id: %w", err)
	}

	return &dispute, nil
}

// GetByOrderID busca disputas de um pedido
func (r *Repository) GetByOrderID(ctx context.Context, orderID string) ([]*Dispute, error) {
	query := `
		SELECT id, order_id, opened_by_user_id, opened_by_role, status, title, description,
		       resolution, resolution_notes, resolved_by_admin_id, resolved_at, created_at, updated_at
		FROM disputes
		WHERE order_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, fmt.Errorf("get disputes by order: %w", err)
	}
	defer rows.Close()

	var disputes []*Dispute
	for rows.Next() {
		var dispute Dispute
		err := rows.Scan(
			&dispute.ID,
			&dispute.OrderID,
			&dispute.OpenedByUserID,
			&dispute.OpenedByRole,
			&dispute.Status,
			&dispute.Title,
			&dispute.Description,
			&dispute.Resolution,
			&dispute.ResolutionNotes,
			&dispute.ResolvedByAdminID,
			&dispute.ResolvedAt,
			&dispute.CreatedAt,
			&dispute.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan dispute: %w", err)
		}
		disputes = append(disputes, &dispute)
	}

	return disputes, nil
}

// GetAll busca todas as disputas (para admin)
func (r *Repository) GetAll(ctx context.Context, status *DisputeStatus, limit, offset int) ([]*Dispute, error) {
	query := `
		SELECT id, order_id, opened_by_user_id, opened_by_role, status, title, description,
		       resolution, resolution_notes, resolved_by_admin_id, resolved_at, created_at, updated_at
		FROM disputes
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	query += " ORDER BY created_at DESC"

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, limit)
		argIndex++
	}

	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get all disputes: %w", err)
	}
	defer rows.Close()

	var disputes []*Dispute
	for rows.Next() {
		var dispute Dispute
		err := rows.Scan(
			&dispute.ID,
			&dispute.OrderID,
			&dispute.OpenedByUserID,
			&dispute.OpenedByRole,
			&dispute.Status,
			&dispute.Title,
			&dispute.Description,
			&dispute.Resolution,
			&dispute.ResolutionNotes,
			&dispute.ResolvedByAdminID,
			&dispute.ResolvedAt,
			&dispute.CreatedAt,
			&dispute.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan dispute: %w", err)
		}
		disputes = append(disputes, &dispute)
	}

	return disputes, nil
}

// UpdateStatus atualiza o status da disputa
func (r *Repository) UpdateStatus(ctx context.Context, disputeID string, status DisputeStatus) error {
	query := `
		UPDATE disputes
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.Exec(ctx, query, status, time.Now(), disputeID)
	if err != nil {
		return fmt.Errorf("update dispute status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrDisputeNotFound
	}

	return nil
}

// ResolveDispute marca a disputa como resolvida
func (r *Repository) ResolveDispute(ctx context.Context, disputeID, adminID string, req *ResolveDisputeRequest) error {
	query := `
		UPDATE disputes
		SET status = $1, resolution = $2, resolution_notes = $3,
		    resolved_by_admin_id = $4, resolved_at = $5, updated_at = $5
		WHERE id = $6
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query,
		DisputeStatusResolvida,
		req.Resolution,
		req.ResolutionNotes,
		adminID,
		now,
		disputeID,
	)
	if err != nil {
		return fmt.Errorf("resolve dispute: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrDisputeNotFound
	}

	return nil
}

// OrderParties contém os IDs das partes de um pedido relacionado a uma disputa
type OrderParties struct {
	StudentID      string
	CollaboratorID string
}

// GetOrderPartiesByDisputeID busca student_id e collaborator_id do pedido relacionado à disputa
func (r *Repository) GetOrderPartiesByDisputeID(ctx context.Context, disputeID string) (*OrderParties, error) {
	query := `
		SELECT o.student_id, o.collaborator_id
		FROM disputes d
		JOIN orders o ON o.id = d.order_id
		WHERE d.id = $1
	`

	var parties OrderParties
	err := r.db.QueryRow(ctx, query, disputeID).Scan(&parties.StudentID, &parties.CollaboratorID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDisputeNotFound
		}
		return nil, fmt.Errorf("get order parties by dispute: %w", err)
	}

	return &parties, nil
}

// AddComment adiciona um comentário na thread
func (r *Repository) AddComment(ctx context.Context, disputeID, userID, userRole string, req *AddCommentRequest) (*DisputeComment, error) {
	query := `
		INSERT INTO dispute_comments (dispute_id, user_id, user_role, comment, is_internal)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, dispute_id, user_id, user_role, comment, is_internal, created_at
	`

	var comment DisputeComment
	err := r.db.QueryRow(ctx, query,
		disputeID,
		userID,
		userRole,
		req.Comment,
		req.IsInternal,
	).Scan(
		&comment.ID,
		&comment.DisputeID,
		&comment.UserID,
		&comment.UserRole,
		&comment.Comment,
		&comment.IsInternal,
		&comment.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("add comment: %w", err)
	}

	return &comment, nil
}

// GetComments busca todos os comentários de uma disputa
func (r *Repository) GetComments(ctx context.Context, disputeID string, includeInternal bool) ([]DisputeComment, error) {
	query := `
		SELECT id, dispute_id, user_id, user_role, comment, is_internal, created_at
		FROM dispute_comments
		WHERE dispute_id = $1
	`

	if !includeInternal {
		query += " AND is_internal = FALSE"
	}

	query += " ORDER BY created_at ASC"

	rows, err := r.db.Query(ctx, query, disputeID)
	if err != nil {
		return nil, fmt.Errorf("get comments: %w", err)
	}
	defer rows.Close()

	var comments []DisputeComment
	for rows.Next() {
		var comment DisputeComment
		err := rows.Scan(
			&comment.ID,
			&comment.DisputeID,
			&comment.UserID,
			&comment.UserRole,
			&comment.Comment,
			&comment.IsInternal,
			&comment.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

// AddEvidence adiciona uma evidência
func (r *Repository) AddEvidence(ctx context.Context, disputeID, userID, userRole string, req *UploadEvidenceRequest) (*DisputeEvidence, error) {
	query := `
		INSERT INTO dispute_evidence (dispute_id, uploaded_by_user_id, uploaded_by_role, file_name, file_path, file_type, file_size, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, dispute_id, uploaded_by_user_id, uploaded_by_role, file_name, file_path, file_type, file_size, description, created_at
	`

	var evidence DisputeEvidence
	err := r.db.QueryRow(ctx, query,
		disputeID,
		userID,
		userRole,
		req.FileName,
		req.FilePath,
		req.FileType,
		req.FileSize,
		req.Description,
	).Scan(
		&evidence.ID,
		&evidence.DisputeID,
		&evidence.UploadedByUserID,
		&evidence.UploadedByRole,
		&evidence.FileName,
		&evidence.FilePath,
		&evidence.FileType,
		&evidence.FileSize,
		&evidence.Description,
		&evidence.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("add evidence: %w", err)
	}

	return &evidence, nil
}

// GetEvidence busca todas as evidências de uma disputa
func (r *Repository) GetEvidence(ctx context.Context, disputeID string) ([]DisputeEvidence, error) {
	query := `
		SELECT id, dispute_id, uploaded_by_user_id, uploaded_by_role, file_name, file_path, file_type, file_size, description, created_at
		FROM dispute_evidence
		WHERE dispute_id = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(ctx, query, disputeID)
	if err != nil {
		return nil, fmt.Errorf("get evidence: %w", err)
	}
	defer rows.Close()

	var evidences []DisputeEvidence
	for rows.Next() {
		var evidence DisputeEvidence
		err := rows.Scan(
			&evidence.ID,
			&evidence.DisputeID,
			&evidence.UploadedByUserID,
			&evidence.UploadedByRole,
			&evidence.FileName,
			&evidence.FilePath,
			&evidence.FileType,
			&evidence.FileSize,
			&evidence.Description,
			&evidence.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan evidence: %w", err)
		}
		evidences = append(evidences, evidence)
	}

	return evidences, nil
}
