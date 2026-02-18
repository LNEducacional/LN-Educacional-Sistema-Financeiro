package payment

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository interface para operações de banco de dados do módulo payment
type Repository interface {
	// Charges
	CreateCharge(ctx context.Context, charge *Charge) error
	GetChargeByOrderID(ctx context.Context, orderID string) (*Charge, error)
	GetChargeByAsaasID(ctx context.Context, asaasChargeID string) (*Charge, error)
	UpdateChargeStatus(ctx context.Context, id string, status ChargeStatus, paidAt *time.Time) error
	UpdateChargeAsaasData(ctx context.Context, id string, asaasID, invoiceURL, pixQR, pixPayload, bankSlipURL *string) error

	// ASAAS Customers
	GetAsaasCustomerByUserID(ctx context.Context, userID string) (*AsaasCustomer, error)
	CreateAsaasCustomer(ctx context.Context, userID, asaasCustomerID string) error

	// Payouts
	CreatePayout(ctx context.Context, payout *Payout) error
	GetPayoutByID(ctx context.Context, id string) (*Payout, error)
	GetPayoutByAsaasID(ctx context.Context, asaasTransferID string) (*Payout, error)
	GetPayoutsByCollaboratorID(ctx context.Context, collaboratorID string, limit, offset int) ([]Payout, int, error)
	GetPendingPayouts(ctx context.Context, limit int) ([]Payout, error)
	GetApprovedPayouts(ctx context.Context, limit int) ([]Payout, error)
	UpdatePayoutStatus(ctx context.Context, id string, status PayoutStatus, asaasTransferID *string, errorMsg *string) error
	UpdatePayoutCompleted(ctx context.Context, id string, netValue float64, fee float64) error
	IncrementPayoutRetry(ctx context.Context, id string) error
	GetDailyPayoutTotal(ctx context.Context, collaboratorID string) (float64, error)
	ListAllPayouts(ctx context.Context, status string, limit, offset int) ([]AdminPayoutListItem, error)
	CountAllPayouts(ctx context.Context, status string) (int, error)
	ApprovePayout(ctx context.Context, id, adminID string) error
	RejectPayout(ctx context.Context, id, adminID, reason string) error

	// Student Charges
	GetChargesByStudentID(ctx context.Context, studentID string, limit, offset int) ([]StudentChargeListItem, error)
	CountChargesByStudentID(ctx context.Context, studentID string) (int, error)

	// Webhook Logs
	IsWebhookProcessed(ctx context.Context, eventID string) (bool, error)
	CreateWebhookLog(ctx context.Context, eventID, eventType, rawPayload string) error
	MarkWebhookProcessed(ctx context.Context, eventID string, err *string) error

	// Order ownership
	GetOrderOwnership(ctx context.Context, orderID string) (studentID, collaboratorID string, err error)
}

type repository struct {
	db *pgxpool.Pool
}

// NewRepository cria um novo repositório de payment
func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

// ----- Charges -----

func (r *repository) CreateCharge(ctx context.Context, charge *Charge) error {
	query := `
		INSERT INTO charges (
			id, order_id, asaas_charge_id, asaas_customer_id, status, billing_type,
			value, net_value, invoice_url, bank_slip_url, pix_qr_code, pix_payload,
			pix_expiration, due_date, paid_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
	`

	_, err := r.db.Exec(ctx, query,
		charge.ID, charge.OrderID, charge.AsaasChargeID, charge.AsaasCustomerID,
		charge.Status, charge.BillingType, charge.Value, charge.NetValue,
		charge.InvoiceURL, charge.BankSlipURL, charge.PixQRCode, charge.PixPayload,
		charge.PixExpiration, charge.DueDate, charge.PaidAt, charge.CreatedAt, charge.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create charge: %w", err)
	}
	return nil
}

func (r *repository) GetChargeByOrderID(ctx context.Context, orderID string) (*Charge, error) {
	query := `
		SELECT id, order_id, asaas_charge_id, asaas_customer_id, status, billing_type,
			   value, net_value, invoice_url, bank_slip_url, pix_qr_code, pix_payload,
			   pix_expiration, due_date, paid_at, refunded_at, created_at, updated_at
		FROM charges
		WHERE order_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var c Charge
	err := r.db.QueryRow(ctx, query, orderID).Scan(
		&c.ID, &c.OrderID, &c.AsaasChargeID, &c.AsaasCustomerID, &c.Status, &c.BillingType,
		&c.Value, &c.NetValue, &c.InvoiceURL, &c.BankSlipURL, &c.PixQRCode, &c.PixPayload,
		&c.PixExpiration, &c.DueDate, &c.PaidAt, &c.RefundedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get charge by order: %w", err)
	}
	return &c, nil
}

func (r *repository) GetChargeByAsaasID(ctx context.Context, asaasChargeID string) (*Charge, error) {
	query := `
		SELECT id, order_id, asaas_charge_id, asaas_customer_id, status, billing_type,
			   value, net_value, invoice_url, bank_slip_url, pix_qr_code, pix_payload,
			   pix_expiration, due_date, paid_at, refunded_at, created_at, updated_at
		FROM charges
		WHERE asaas_charge_id = $1
	`

	var c Charge
	err := r.db.QueryRow(ctx, query, asaasChargeID).Scan(
		&c.ID, &c.OrderID, &c.AsaasChargeID, &c.AsaasCustomerID, &c.Status, &c.BillingType,
		&c.Value, &c.NetValue, &c.InvoiceURL, &c.BankSlipURL, &c.PixQRCode, &c.PixPayload,
		&c.PixExpiration, &c.DueDate, &c.PaidAt, &c.RefundedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get charge by asaas id: %w", err)
	}
	return &c, nil
}

func (r *repository) UpdateChargeStatus(ctx context.Context, id string, status ChargeStatus, paidAt *time.Time) error {
	query := `
		UPDATE charges
		SET status = $2, paid_at = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id, status, paidAt)
	if err != nil {
		return fmt.Errorf("update charge status: %w", err)
	}
	return nil
}

func (r *repository) UpdateChargeAsaasData(ctx context.Context, id string, asaasID, invoiceURL, pixQR, pixPayload, bankSlipURL *string) error {
	query := `
		UPDATE charges
		SET asaas_charge_id = COALESCE($2, asaas_charge_id),
			invoice_url = COALESCE($3, invoice_url),
			pix_qr_code = COALESCE($4, pix_qr_code),
			pix_payload = COALESCE($5, pix_payload),
			bank_slip_url = COALESCE($6, bank_slip_url),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id, asaasID, invoiceURL, pixQR, pixPayload, bankSlipURL)
	if err != nil {
		return fmt.Errorf("update charge asaas data: %w", err)
	}
	return nil
}

// ----- ASAAS Customers -----

func (r *repository) GetAsaasCustomerByUserID(ctx context.Context, userID string) (*AsaasCustomer, error) {
	query := `
		SELECT id, user_id, asaas_customer_id, created_at
		FROM asaas_customers
		WHERE user_id = $1
	`

	var c AsaasCustomer
	err := r.db.QueryRow(ctx, query, userID).Scan(&c.ID, &c.UserID, &c.AsaasCustomerID, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get asaas customer: %w", err)
	}
	return &c, nil
}

func (r *repository) CreateAsaasCustomer(ctx context.Context, userID, asaasCustomerID string) error {
	query := `
		INSERT INTO asaas_customers (user_id, asaas_customer_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, userID, asaasCustomerID)
	if err != nil {
		return fmt.Errorf("create asaas customer: %w", err)
	}
	return nil
}

// ----- Payouts -----

func (r *repository) CreatePayout(ctx context.Context, payout *Payout) error {
	query := `
		INSERT INTO payouts (
			id, collaborator_id, wallet_id, status, value, pix_key, pix_key_type,
			description, retry_count, max_retries, requested_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
	`

	_, err := r.db.Exec(ctx, query,
		payout.ID, payout.CollaboratorID, payout.WalletID, payout.Status,
		payout.Value, payout.PixKey, payout.PixKeyType, payout.Description,
		payout.RetryCount, payout.MaxRetries, payout.RequestedAt,
	)
	if err != nil {
		return fmt.Errorf("create payout: %w", err)
	}
	return nil
}

func (r *repository) GetPayoutByID(ctx context.Context, id string) (*Payout, error) {
	query := `
		SELECT id, collaborator_id, wallet_id, asaas_transfer_id, status, value,
			   net_value, fee, pix_key, pix_key_type, description, error_message,
			   retry_count, max_retries, requested_at, processed_at, completed_at, failed_at
		FROM payouts
		WHERE id = $1
	`

	var p Payout
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.CollaboratorID, &p.WalletID, &p.AsaasTransferID, &p.Status, &p.Value,
		&p.NetValue, &p.Fee, &p.PixKey, &p.PixKeyType, &p.Description, &p.ErrorMessage,
		&p.RetryCount, &p.MaxRetries, &p.RequestedAt, &p.ProcessedAt, &p.CompletedAt, &p.FailedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get payout by id: %w", err)
	}
	return &p, nil
}

func (r *repository) GetPayoutByAsaasID(ctx context.Context, asaasTransferID string) (*Payout, error) {
	query := `
		SELECT id, collaborator_id, wallet_id, asaas_transfer_id, status, value,
			   net_value, fee, pix_key, pix_key_type, description, error_message,
			   retry_count, max_retries, requested_at, processed_at, completed_at, failed_at
		FROM payouts
		WHERE asaas_transfer_id = $1
	`

	var p Payout
	err := r.db.QueryRow(ctx, query, asaasTransferID).Scan(
		&p.ID, &p.CollaboratorID, &p.WalletID, &p.AsaasTransferID, &p.Status, &p.Value,
		&p.NetValue, &p.Fee, &p.PixKey, &p.PixKeyType, &p.Description, &p.ErrorMessage,
		&p.RetryCount, &p.MaxRetries, &p.RequestedAt, &p.ProcessedAt, &p.CompletedAt, &p.FailedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get payout by asaas id: %w", err)
	}
	return &p, nil
}

func (r *repository) GetPayoutsByCollaboratorID(ctx context.Context, collaboratorID string, limit, offset int) ([]Payout, int, error) {
	countQuery := `SELECT COUNT(*) FROM payouts WHERE collaborator_id = $1`
	var total int
	if err := r.db.QueryRow(ctx, countQuery, collaboratorID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count payouts: %w", err)
	}

	query := `
		SELECT id, collaborator_id, wallet_id, asaas_transfer_id, status, value,
			   net_value, fee, pix_key, pix_key_type, description, error_message,
			   retry_count, max_retries, requested_at, processed_at, completed_at, failed_at
		FROM payouts
		WHERE collaborator_id = $1
		ORDER BY requested_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, collaboratorID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get payouts: %w", err)
	}
	defer rows.Close()

	var payouts []Payout
	for rows.Next() {
		var p Payout
		if err := rows.Scan(
			&p.ID, &p.CollaboratorID, &p.WalletID, &p.AsaasTransferID, &p.Status, &p.Value,
			&p.NetValue, &p.Fee, &p.PixKey, &p.PixKeyType, &p.Description, &p.ErrorMessage,
			&p.RetryCount, &p.MaxRetries, &p.RequestedAt, &p.ProcessedAt, &p.CompletedAt, &p.FailedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan payout: %w", err)
		}
		payouts = append(payouts, p)
	}

	return payouts, total, nil
}

func (r *repository) GetPendingPayouts(ctx context.Context, limit int) ([]Payout, error) {
	query := `
		SELECT id, collaborator_id, wallet_id, asaas_transfer_id, status, value,
			   net_value, fee, pix_key, pix_key_type, description, error_message,
			   retry_count, max_retries, requested_at, processed_at, completed_at, failed_at
		FROM payouts
		WHERE status = 'PENDING' AND retry_count < max_retries
		ORDER BY requested_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("get pending payouts: %w", err)
	}
	defer rows.Close()

	var payouts []Payout
	for rows.Next() {
		var p Payout
		if err := rows.Scan(
			&p.ID, &p.CollaboratorID, &p.WalletID, &p.AsaasTransferID, &p.Status, &p.Value,
			&p.NetValue, &p.Fee, &p.PixKey, &p.PixKeyType, &p.Description, &p.ErrorMessage,
			&p.RetryCount, &p.MaxRetries, &p.RequestedAt, &p.ProcessedAt, &p.CompletedAt, &p.FailedAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending payout: %w", err)
		}
		payouts = append(payouts, p)
	}

	return payouts, nil
}

func (r *repository) GetApprovedPayouts(ctx context.Context, limit int) ([]Payout, error) {
	query := `
		SELECT id, collaborator_id, wallet_id, asaas_transfer_id, status, value,
			   net_value, fee, pix_key, pix_key_type, description, error_message,
			   retry_count, max_retries, requested_at, processed_at, completed_at, failed_at
		FROM payouts
		WHERE status = 'APPROVED' AND retry_count < max_retries
		ORDER BY requested_at ASC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("get approved payouts: %w", err)
	}
	defer rows.Close()

	var payouts []Payout
	for rows.Next() {
		var p Payout
		if err := rows.Scan(
			&p.ID, &p.CollaboratorID, &p.WalletID, &p.AsaasTransferID, &p.Status, &p.Value,
			&p.NetValue, &p.Fee, &p.PixKey, &p.PixKeyType, &p.Description, &p.ErrorMessage,
			&p.RetryCount, &p.MaxRetries, &p.RequestedAt, &p.ProcessedAt, &p.CompletedAt, &p.FailedAt,
		); err != nil {
			return nil, fmt.Errorf("scan approved payout: %w", err)
		}
		payouts = append(payouts, p)
	}

	return payouts, nil
}

func (r *repository) ListAllPayouts(ctx context.Context, status string, limit, offset int) ([]AdminPayoutListItem, error) {
	var query string
	var args []interface{}

	if status != "" {
		query = `
			SELECT p.id, p.collaborator_id, u.name, p.status, p.value,
				   p.pix_key, p.pix_key_type, p.rejection_reason,
				   p.requested_at, p.reviewed_at, p.completed_at
			FROM payouts p
			JOIN users u ON u.id = p.collaborator_id
			WHERE p.status = $1
			ORDER BY p.requested_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{status, limit, offset}
	} else {
		query = `
			SELECT p.id, p.collaborator_id, u.name, p.status, p.value,
				   p.pix_key, p.pix_key_type, p.rejection_reason,
				   p.requested_at, p.reviewed_at, p.completed_at
			FROM payouts p
			JOIN users u ON u.id = p.collaborator_id
			ORDER BY p.requested_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list all payouts: %w", err)
	}
	defer rows.Close()

	var items []AdminPayoutListItem
	for rows.Next() {
		var item AdminPayoutListItem
		if err := rows.Scan(
			&item.ID, &item.CollaboratorID, &item.CollaboratorName, &item.Status, &item.Value,
			&item.PixKey, &item.PixKeyType, &item.RejectionReason,
			&item.RequestedAt, &item.ReviewedAt, &item.CompletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin payout item: %w", err)
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *repository) CountAllPayouts(ctx context.Context, status string) (int, error) {
	var query string
	var args []interface{}

	if status != "" {
		query = `SELECT COUNT(*) FROM payouts WHERE status = $1`
		args = []interface{}{status}
	} else {
		query = `SELECT COUNT(*) FROM payouts`
	}

	var total int
	if err := r.db.QueryRow(ctx, query, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("count all payouts: %w", err)
	}
	return total, nil
}

func (r *repository) ApprovePayout(ctx context.Context, id, adminID string) error {
	query := `
		UPDATE payouts
		SET status = 'APPROVED', approved_by = $2, reviewed_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'PENDING'
	`
	result, err := r.db.Exec(ctx, query, id, adminID)
	if err != nil {
		return fmt.Errorf("approve payout: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("payout not found or not in PENDING status")
	}
	return nil
}

func (r *repository) RejectPayout(ctx context.Context, id, adminID, reason string) error {
	query := `
		UPDATE payouts
		SET status = 'REJECTED', rejected_by = $2, rejection_reason = $3, reviewed_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'PENDING'
	`
	result, err := r.db.Exec(ctx, query, id, adminID, reason)
	if err != nil {
		return fmt.Errorf("reject payout: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("payout not found or not in PENDING status")
	}
	return nil
}

func (r *repository) UpdatePayoutStatus(ctx context.Context, id string, status PayoutStatus, asaasTransferID *string, errorMsg *string) error {
	var query string
	var args []interface{}

	switch status {
	case PayoutStatusProcessing:
		query = `
			UPDATE payouts
			SET status = $2, asaas_transfer_id = $3, processed_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`
		args = []interface{}{id, status, asaasTransferID}
	case PayoutStatusFailed:
		query = `
			UPDATE payouts
			SET status = $2, error_message = $3, failed_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`
		args = []interface{}{id, status, errorMsg}
	case PayoutStatusDone:
		query = `
			UPDATE payouts
			SET status = $2, completed_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`
		args = []interface{}{id, status}
	default:
		query = `UPDATE payouts SET status = $2 WHERE id = $1`
		args = []interface{}{id, status}
	}

	_, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update payout status: %w", err)
	}
	return nil
}

func (r *repository) UpdatePayoutCompleted(ctx context.Context, id string, netValue float64, fee float64) error {
	query := `
		UPDATE payouts
		SET status = 'DONE', net_value = $2, fee = $3, completed_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id, netValue, fee)
	if err != nil {
		return fmt.Errorf("update payout completed: %w", err)
	}
	return nil
}

func (r *repository) IncrementPayoutRetry(ctx context.Context, id string) error {
	query := `UPDATE payouts SET retry_count = retry_count + 1 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("increment payout retry: %w", err)
	}
	return nil
}

func (r *repository) GetDailyPayoutTotal(ctx context.Context, collaboratorID string) (float64, error) {
	query := `
		SELECT COALESCE(SUM(value), 0)
		FROM payouts
		WHERE collaborator_id = $1
		  AND status NOT IN ('CANCELLED', 'FAILED')
		  AND requested_at >= CURRENT_DATE
	`
	var total float64
	if err := r.db.QueryRow(ctx, query, collaboratorID).Scan(&total); err != nil {
		return 0, fmt.Errorf("get daily payout total: %w", err)
	}
	return total, nil
}

// ----- Student Charges -----

func (r *repository) GetChargesByStudentID(ctx context.Context, studentID string, limit, offset int) ([]StudentChargeListItem, error) {
	query := `
		SELECT c.id, c.order_id, s.name, c.status, c.billing_type, c.value,
		       c.invoice_url, c.pix_qr_code, c.pix_payload, c.bank_slip_url,
		       c.due_date, c.paid_at, c.created_at
		FROM charges c
		JOIN orders o ON o.id = c.order_id
		JOIN services s ON s.id = o.service_id
		WHERE o.student_id = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, studentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("get charges by student: %w", err)
	}
	defer rows.Close()

	var items []StudentChargeListItem
	for rows.Next() {
		var item StudentChargeListItem
		if err := rows.Scan(
			&item.ID, &item.OrderID, &item.ServiceName, &item.Status, &item.BillingType, &item.Value,
			&item.InvoiceURL, &item.PixQRCode, &item.PixPayload, &item.BankSlipURL,
			&item.DueDate, &item.PaidAt, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan student charge item: %w", err)
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *repository) CountChargesByStudentID(ctx context.Context, studentID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM charges c
		JOIN orders o ON o.id = c.order_id
		WHERE o.student_id = $1
	`
	var total int
	if err := r.db.QueryRow(ctx, query, studentID).Scan(&total); err != nil {
		return 0, fmt.Errorf("count charges by student: %w", err)
	}
	return total, nil
}

// ----- Webhook Logs -----

func (r *repository) IsWebhookProcessed(ctx context.Context, eventID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM webhook_logs WHERE event_id = $1)`
	var exists bool
	if err := r.db.QueryRow(ctx, query, eventID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check webhook processed: %w", err)
	}
	return exists, nil
}

func (r *repository) CreateWebhookLog(ctx context.Context, eventID, eventType, rawPayload string) error {
	query := `
		INSERT INTO webhook_logs (event_id, event_type, raw_payload, processed)
		VALUES ($1, $2, $3, false)
		ON CONFLICT (event_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, eventID, eventType, rawPayload)
	if err != nil {
		return fmt.Errorf("create webhook log: %w", err)
	}
	return nil
}

func (r *repository) MarkWebhookProcessed(ctx context.Context, eventID string, processingError *string) error {
	query := `
		UPDATE webhook_logs
		SET processed = true, processing_error = $2, processed_at = CURRENT_TIMESTAMP
		WHERE event_id = $1
	`
	_, err := r.db.Exec(ctx, query, eventID, processingError)
	if err != nil {
		return fmt.Errorf("mark webhook processed: %w", err)
	}
	return nil
}

// ----- Order Ownership -----

func (r *repository) GetOrderOwnership(ctx context.Context, orderID string) (string, string, error) {
	query := `SELECT COALESCE(student_id, ''), COALESCE(collaborator_id, '') FROM orders WHERE id = $1`
	var studentID, collaboratorID string
	if err := r.db.QueryRow(ctx, query, orderID).Scan(&studentID, &collaboratorID); err != nil {
		return "", "", fmt.Errorf("get order ownership: %w", err)
	}
	return studentID, collaboratorID, nil
}
