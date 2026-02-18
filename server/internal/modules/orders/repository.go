package orders

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrderNotFound = errors.New("order not found")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateTx creates an order within a transaction
func (r *Repository) CreateTx(ctx context.Context, tx pgx.Tx, order *Order) error {
	query := `
		INSERT INTO orders (
			student_id, collaborator_id, service_id, status, payment_status,
			total_value, company_percent, collab_percent, collab_value, due_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`
	err := tx.QueryRow(ctx, query,
		order.StudentID,
		order.CollaboratorID,
		order.ServiceID,
		order.Status,
		order.PaymentStatus,
		order.TotalValue,
		order.CompanyPercent,
		order.CollabPercent,
		order.CollabValue,
		order.DueDate,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)
	return err
}

// GetByID retrieves an order by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*Order, error) {
	query := `
		SELECT id, student_id, collaborator_id, service_id, status, payment_status,
		       total_value, company_percent, collab_percent, collab_value, due_date,
		       created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	var o Order
	err := r.db.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.StudentID, &o.CollaboratorID, &o.ServiceID, &o.Status, &o.PaymentStatus,
		&o.TotalValue, &o.CompanyPercent, &o.CollabPercent, &o.CollabValue, &o.DueDate,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &o, nil
}

// GetByIDTx retrieves an order within a transaction (with row lock)
func (r *Repository) GetByIDTx(ctx context.Context, tx pgx.Tx, id string) (*Order, error) {
	query := `
		SELECT id, student_id, collaborator_id, service_id, status, payment_status,
		       total_value, company_percent, collab_percent, collab_value, due_date,
		       created_at, updated_at
		FROM orders
		WHERE id = $1
		FOR UPDATE
	`
	var o Order
	err := tx.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.StudentID, &o.CollaboratorID, &o.ServiceID, &o.Status, &o.PaymentStatus,
		&o.TotalValue, &o.CompanyPercent, &o.CollabPercent, &o.CollabValue, &o.DueDate,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &o, nil
}

// ListByStudentID retrieves all orders for a student
func (r *Repository) ListByStudentID(ctx context.Context, studentID string) ([]Order, error) {
	query := `
		SELECT id, student_id, collaborator_id, service_id, status, payment_status,
		       total_value, company_percent, collab_percent, collab_value, due_date,
		       created_at, updated_at
		FROM orders
		WHERE student_id = $1
		ORDER BY created_at DESC
	`
	return r.queryOrders(ctx, query, studentID)
}

// ListByCollaboratorID retrieves all orders for a collaborator
func (r *Repository) ListByCollaboratorID(ctx context.Context, collaboratorID string) ([]Order, error) {
	query := `
		SELECT id, student_id, collaborator_id, service_id, status, payment_status,
		       total_value, company_percent, collab_percent, collab_value, due_date,
		       created_at, updated_at
		FROM orders
		WHERE collaborator_id = $1
		ORDER BY created_at DESC
	`
	return r.queryOrders(ctx, query, collaboratorID)
}

// List retrieves all orders (admin view)
func (r *Repository) List(ctx context.Context) ([]Order, error) {
	query := `
		SELECT id, student_id, collaborator_id, service_id, status, payment_status,
		       total_value, company_percent, collab_percent, collab_value, due_date,
		       created_at, updated_at
		FROM orders
		ORDER BY created_at DESC
	`
	return r.queryOrders(ctx, query)
}

func (r *Repository) queryOrders(ctx context.Context, query string, args ...interface{}) ([]Order, error) {
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var o Order
		err := rows.Scan(
			&o.ID, &o.StudentID, &o.CollaboratorID, &o.ServiceID, &o.Status, &o.PaymentStatus,
			&o.TotalValue, &o.CompanyPercent, &o.CollabPercent, &o.CollabValue, &o.DueDate,
			&o.CreatedAt, &o.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

// UpdateStatusTx updates order status within a transaction
func (r *Repository) UpdateStatusTx(ctx context.Context, tx pgx.Tx, id string, status OrderStatus) error {
	query := `
		UPDATE orders
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, id, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrOrderNotFound
	}
	return nil
}

// UpdatePaymentStatusTx updates payment status within a transaction
func (r *Repository) UpdatePaymentStatusTx(ctx context.Context, tx pgx.Tx, id string, paymentStatus PaymentStatus) error {
	query := `
		UPDATE orders
		SET payment_status = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, id, paymentStatus)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrOrderNotFound
	}
	return nil
}

// MarkOverdueOrders marks orders as ATRASADO if due_date has passed
func (r *Repository) MarkOverdueOrders(ctx context.Context) (int64, error) {
	query := `
		UPDATE orders
		SET status = 'ATRASADO', updated_at = NOW()
		WHERE status IN ('NOVO', 'EM_ANDAMENTO')
		  AND due_date < NOW()
	`
	result, err := r.db.Exec(ctx, query)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// ListByCollaboratorWithDetails returns orders with joined student/service names
// Exposes all financial details including total_value, percentages, and revision count
func (r *Repository) ListByCollaboratorWithDetails(ctx context.Context, collaboratorID string) ([]CollaboratorOrderView, error) {
	query := `
		SELECT
			o.id,
			u.name as student_name,
			s.name as service_name,
			o.collab_value as my_share,
			o.total_value,
			o.company_percent,
			o.collab_percent,
			o.total_value - o.collab_value as company_value,
			o.status,
			o.payment_status,
			o.due_date,
			(SELECT COUNT(*) FROM order_revisions r WHERE r.order_id = o.id) as revision_count
		FROM orders o
		JOIN users u ON o.student_id = u.id
		JOIN services s ON o.service_id = s.id
		WHERE o.collaborator_id = $1
		ORDER BY o.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, collaboratorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []CollaboratorOrderView
	for rows.Next() {
		var o CollaboratorOrderView
		err := rows.Scan(
			&o.ID, &o.StudentName, &o.ServiceName, &o.MyShare,
			&o.TotalValue, &o.CompanyPercent, &o.CollabPercent, &o.CompanyValue,
			&o.Status, &o.PaymentStatus, &o.DueDate, &o.RevisionCount,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

// CreateDeliveryTx creates a delivery record within a transaction
func (r *Repository) CreateDeliveryTx(ctx context.Context, tx pgx.Tx, input CreateDeliveryInput) (*Delivery, error) {
	query := `
		INSERT INTO deliveries (order_id, file_path, original_name, mime_type, file_size)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_id, file_path, original_name, mime_type, file_size, created_at
	`
	var d Delivery
	err := tx.QueryRow(ctx, query,
		input.OrderID,
		input.FilePath,
		input.OriginalName,
		input.MimeType,
		input.FileSize,
	).Scan(&d.ID, &d.OrderID, &d.FilePath, &d.OriginalName, &d.MimeType, &d.FileSize, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// GetDeliveriesByOrderID retrieves all deliveries for an order
func (r *Repository) GetDeliveriesByOrderID(ctx context.Context, orderID string) ([]Delivery, error) {
	query := `
		SELECT id, order_id, file_path, original_name, mime_type, file_size, created_at
		FROM deliveries
		WHERE order_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deliveries []Delivery
	for rows.Next() {
		var d Delivery
		err := rows.Scan(&d.ID, &d.OrderID, &d.FilePath, &d.OriginalName, &d.MimeType, &d.FileSize, &d.CreatedAt)
		if err != nil {
			return nil, err
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}

// CreateRevisionTx inserts revision record within transaction
func (r *Repository) CreateRevisionTx(ctx context.Context, tx pgx.Tx, input CreateRevisionInput) (*OrderRevision, error) {
	query := `
		INSERT INTO order_revisions (order_id, reason)
		VALUES ($1, $2)
		RETURNING id, order_id, reason, created_at
	`
	var rev OrderRevision
	err := tx.QueryRow(ctx, query, input.OrderID, input.Reason).Scan(
		&rev.ID, &rev.OrderID, &rev.Reason, &rev.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rev, nil
}

// GetRevisionsByOrderID returns revision history for an order
func (r *Repository) GetRevisionsByOrderID(ctx context.Context, orderID string) ([]OrderRevision, error) {
	query := `
		SELECT id, order_id, reason, created_at
		FROM order_revisions
		WHERE order_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []OrderRevision
	for rows.Next() {
		var rev OrderRevision
		err := rows.Scan(&rev.ID, &rev.OrderID, &rev.Reason, &rev.CreatedAt)
		if err != nil {
			return nil, err
		}
		revisions = append(revisions, rev)
	}
	return revisions, nil
}

// ListByStudentWithDetails returns orders with service/collaborator names for student view
func (r *Repository) ListByStudentWithDetails(ctx context.Context, studentID string) ([]StudentOrderView, error) {
	query := `
		SELECT o.id, u.name as collaborator_name, s.name as service_name,
		       o.total_value, o.status, o.due_date
		FROM orders o
		JOIN users u ON o.collaborator_id = u.id
		JOIN services s ON o.service_id = s.id
		WHERE o.student_id = $1
		ORDER BY o.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []StudentOrderView
	for rows.Next() {
		var o StudentOrderView
		err := rows.Scan(&o.ID, &o.CollaboratorName, &o.ServiceName, &o.TotalValue, &o.Status, &o.DueDate)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

// GetOrderDetails returns full order details for student order detail page
func (r *Repository) GetOrderDetails(ctx context.Context, orderID string) (*OrderDetailsResponse, error) {
	// Get order
	order, err := r.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Get service info
	serviceQuery := `SELECT id, name FROM services WHERE id = $1`
	var service ServiceInfo
	err = r.db.QueryRow(ctx, serviceQuery, order.ServiceID).Scan(&service.ID, &service.Name)
	if err != nil {
		return nil, err
	}

	// Get collaborator info
	collabQuery := `SELECT id, name FROM users WHERE id = $1`
	var collab CollaboratorInfo
	err = r.db.QueryRow(ctx, collabQuery, order.CollaboratorID).Scan(&collab.ID, &collab.Name)
	if err != nil {
		return nil, err
	}

	// Get deliveries
	deliveries, err := r.GetDeliveriesByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if deliveries == nil {
		deliveries = []Delivery{}
	}

	// Get revisions
	revisions, err := r.GetRevisionsByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if revisions == nil {
		revisions = []OrderRevision{}
	}

	return &OrderDetailsResponse{
		Order:        *order,
		Service:      service,
		Collaborator: collab,
		Deliveries:   deliveries,
		Revisions:    revisions,
	}, nil
}

// CreateRating inserts a new rating for an order
func (r *Repository) CreateRating(ctx context.Context, input CreateRatingInput) error {
	query := `
		INSERT INTO ratings (order_id, student_id, collaborator_id, score, comment)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(ctx, query,
		input.OrderID,
		input.StudentID,
		input.CollaboratorID,
		input.Score,
		input.Comment,
	)
	return err
}

// RatingExists checks if a rating already exists for an order
func (r *Repository) RatingExists(ctx context.Context, orderID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM ratings WHERE order_id = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, orderID).Scan(&exists)
	return exists, err
}

// CreateStatusHistory registra mudança de status no histórico
func (r *Repository) CreateStatusHistory(ctx context.Context, history *OrderStatusHistory) error {
	query := `
		INSERT INTO order_status_history (
			id, order_id, previous_status, new_status,
			changed_by_user_id, changed_by_role, comments, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Exec(ctx, query,
		history.ID,
		history.OrderID,
		history.PreviousStatus,
		history.NewStatus,
		history.ChangedByUserID,
		history.ChangedByRole,
		history.Comments,
		history.CreatedAt,
	)

	return err
}

// GetOrderStatusHistory retorna histórico de mudanças de status
func (r *Repository) GetOrderStatusHistory(ctx context.Context, orderID string) ([]OrderStatusHistory, error) {
	query := `
		SELECT
			id, order_id, previous_status, new_status,
			changed_by_user_id, changed_by_role, comments, created_at
		FROM order_status_history
		WHERE order_id = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []OrderStatusHistory
	for rows.Next() {
		var h OrderStatusHistory
		err := rows.Scan(
			&h.ID, &h.OrderID, &h.PreviousStatus, &h.NewStatus,
			&h.ChangedByUserID, &h.ChangedByRole, &h.Comments, &h.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		history = append(history, h)
	}

	if history == nil {
		history = []OrderStatusHistory{}
	}

	return history, rows.Err()
}

// UpdateOrderStatus atualiza status do pedido (com validação de transição)
func (r *Repository) UpdateOrderStatus(ctx context.Context, orderID string, newStatus OrderStatus) (OrderStatus, error) {
	// Primeiro buscar status atual
	var currentStatus OrderStatus
	err := r.db.QueryRow(ctx, "SELECT status FROM orders WHERE id = $1", orderID).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrOrderNotFound
		}
		return "", err
	}

	// Validar transição usando state machine
	if err := OrderStateMachine.ValidateTransition(currentStatus, newStatus); err != nil {
		return "", err
	}

	// Atualizar status
	query := `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.Exec(ctx, query, newStatus, orderID)
	if err != nil {
		return "", err
	}

	if result.RowsAffected() == 0 {
		return "", ErrOrderNotFound
	}

	return currentStatus, nil
}

// RequestInternalReview marca pedido como aguardando revisão interna
func (r *Repository) RequestInternalReview(ctx context.Context, orderID string, notes *string) error {
	query := `
		UPDATE orders
		SET
			status = $1,
			internal_review_requested = TRUE,
			internal_review_notes = $2,
			updated_at = NOW()
		WHERE id = $3
	`

	result, err := r.db.Exec(ctx, query, OrderStatusAguardandoRevisao, notes, orderID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrOrderNotFound
	}

	return nil
}

// ClearInternalReview limpa flag de revisão interna
func (r *Repository) ClearInternalReview(ctx context.Context, orderID string) error {
	query := `
		UPDATE orders
		SET
			internal_review_requested = FALSE,
			internal_review_notes = NULL,
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, orderID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrOrderNotFound
	}

	return nil
}

// OrderForRefund representa os dados minimos do pedido para processar reembolso
// Usado para evitar dependencia circular com o modulo payment
type OrderForRefund struct {
	ID             string
	CollaboratorID string
	CollabValue    float64
	PaymentStatus  string
}

// GetByIDForRefund retorna dados minimos do pedido necessarios para reembolso
// Implementa payment.OrderRepositoryForRefund
func (r *Repository) GetByIDForRefund(ctx context.Context, tx pgx.Tx, id string) (*OrderForRefund, error) {
	query := `
		SELECT id, collaborator_id, collab_value, payment_status
		FROM orders
		WHERE id = $1
		FOR UPDATE
	`
	var o OrderForRefund
	err := tx.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.CollaboratorID, &o.CollabValue, &o.PaymentStatus,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}
	return &o, nil
}

// UpdatePaymentStatusForRefund atualiza o payment_status do pedido
// Implementa payment.OrderRepositoryForRefund
func (r *Repository) UpdatePaymentStatusForRefund(ctx context.Context, tx pgx.Tx, id string, status string) error {
	query := `
		UPDATE orders
		SET payment_status = $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, id, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrOrderNotFound
	}
	return nil
}
