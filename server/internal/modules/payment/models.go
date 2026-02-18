package payment

import "time"

// ChargeStatus status de cobrança
type ChargeStatus string

const (
	ChargeStatusPending           ChargeStatus = "PENDING"
	ChargeStatusConfirmed         ChargeStatus = "CONFIRMED"
	ChargeStatusReceived          ChargeStatus = "RECEIVED"
	ChargeStatusOverdue           ChargeStatus = "OVERDUE"
	ChargeStatusRefunded          ChargeStatus = "REFUNDED"
	ChargeStatusPartiallyRefunded ChargeStatus = "PARTIALLY_REFUNDED"
	ChargeStatusCancelled         ChargeStatus = "CANCELLED"
)

// BillingType tipo de cobrança
type BillingType string

const (
	BillingTypePIX        BillingType = "PIX"
	BillingTypeBoleto     BillingType = "BOLETO"
	BillingTypeCreditCard BillingType = "CREDIT_CARD"
)

// PayoutStatus status de saque
type PayoutStatus string

const (
	PayoutStatusPending    PayoutStatus = "PENDING"
	PayoutStatusApproved   PayoutStatus = "APPROVED"
	PayoutStatusRejected   PayoutStatus = "REJECTED"
	PayoutStatusProcessing PayoutStatus = "PROCESSING"
	PayoutStatusDone       PayoutStatus = "DONE"
	PayoutStatusFailed     PayoutStatus = "FAILED"
	PayoutStatusCancelled  PayoutStatus = "CANCELLED"
)

// PixKeyType tipo de chave PIX
type PixKeyType string

const (
	PixKeyTypeCPF   PixKeyType = "CPF"
	PixKeyTypeCNPJ  PixKeyType = "CNPJ"
	PixKeyTypeEmail PixKeyType = "EMAIL"
	PixKeyTypePhone PixKeyType = "PHONE"
	PixKeyTypeEVP   PixKeyType = "EVP"
)

// Charge representa uma cobrança ASAAS
type Charge struct {
	ID              string       `json:"id"`
	OrderID         string       `json:"order_id"`
	AsaasChargeID   *string      `json:"asaas_charge_id,omitempty"`
	AsaasCustomerID *string      `json:"asaas_customer_id,omitempty"`
	Status          ChargeStatus `json:"status"`
	BillingType     BillingType  `json:"billing_type"`
	Value           float64      `json:"value"`
	NetValue        *float64     `json:"net_value,omitempty"`
	InvoiceURL      *string      `json:"invoice_url,omitempty"`
	BankSlipURL     *string      `json:"bank_slip_url,omitempty"`
	PixQRCode       *string      `json:"pix_qr_code,omitempty"`
	PixPayload      *string      `json:"pix_payload,omitempty"`
	PixExpiration   *time.Time   `json:"pix_expiration,omitempty"`
	DueDate         time.Time    `json:"due_date"`
	PaidAt          *time.Time   `json:"paid_at,omitempty"`
	RefundedAt      *time.Time   `json:"refunded_at,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

// AsaasCustomer representa um cliente ASAAS armazenado localmente
type AsaasCustomer struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	AsaasCustomerID string    `json:"asaas_customer_id"`
	CreatedAt       time.Time `json:"created_at"`
}

// Payout representa um saque de colaborador
type Payout struct {
	ID              string       `json:"id"`
	CollaboratorID  string       `json:"collaborator_id"`
	WalletID        string       `json:"wallet_id"`
	AsaasTransferID *string      `json:"asaas_transfer_id,omitempty"`
	Status          PayoutStatus `json:"status"`
	Value           float64      `json:"value"`
	NetValue        *float64     `json:"net_value,omitempty"`
	Fee             float64      `json:"fee"`
	PixKey          string       `json:"pix_key"`
	PixKeyType      PixKeyType   `json:"pix_key_type"`
	Description     *string      `json:"description,omitempty"`
	ErrorMessage    *string      `json:"error_message,omitempty"`
	RetryCount      int          `json:"retry_count"`
	MaxRetries      int          `json:"max_retries"`
	RequestedAt     time.Time    `json:"requested_at"`
	ProcessedAt     *time.Time   `json:"processed_at,omitempty"`
	CompletedAt     *time.Time   `json:"completed_at,omitempty"`
	FailedAt        *time.Time   `json:"failed_at,omitempty"`
	ApprovedBy      *string      `json:"approved_by,omitempty"`
	RejectedBy      *string      `json:"rejected_by,omitempty"`
	RejectionReason *string      `json:"rejection_reason,omitempty"`
	ReviewedAt      *time.Time   `json:"reviewed_at,omitempty"`
}

// WebhookLog representa um log de webhook para idempotência
type WebhookLog struct {
	ID              string    `json:"id"`
	EventID         string    `json:"event_id"`
	EventType       string    `json:"event_type"`
	RawPayload      string    `json:"raw_payload"`
	Processed       bool      `json:"processed"`
	ProcessingError *string   `json:"processing_error,omitempty"`
	ProcessedAt     time.Time `json:"processed_at"`
}

// ----- Input DTOs -----

// CreateChargeInput dados para criar uma cobrança
type CreateChargeInput struct {
	OrderID     string
	Value       float64
	BillingType BillingType
	DueDate     time.Time
	CustomerID  string
}

// CreatePayoutInput dados para criar um saque
type CreatePayoutInput struct {
	CollaboratorID string
	WalletID       string
	Value          float64
	PixKey         string
	PixKeyType     PixKeyType
	Description    string
}

// ----- Response DTOs -----

// ChargeResponse resposta com dados de cobrança
type ChargeResponse struct {
	ID          string       `json:"id"`
	OrderID     string       `json:"order_id"`
	Status      ChargeStatus `json:"status"`
	BillingType BillingType  `json:"billing_type"`
	Value       float64      `json:"value"`
	InvoiceURL  string       `json:"invoice_url"`
	PixQRCode   string       `json:"pix_qr_code,omitempty"`
	PixPayload  string       `json:"pix_payload,omitempty"`
	BankSlipURL string       `json:"bank_slip_url,omitempty"`
	DueDate     time.Time    `json:"due_date"`
	PaidAt      *time.Time   `json:"paid_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

// PayoutResponse resposta com dados de saque
type PayoutResponse struct {
	ID             string       `json:"id"`
	CollaboratorID string       `json:"collaborator_id"`
	Status         PayoutStatus `json:"status"`
	Value          float64      `json:"value"`
	NetValue       float64      `json:"net_value"`
	Fee            float64      `json:"fee"`
	PixKey         string       `json:"pix_key"`
	PixKeyType     PixKeyType   `json:"pix_key_type"`
	ErrorMessage   string       `json:"error_message,omitempty"`
	RequestedAt    time.Time    `json:"requested_at"`
	CompletedAt    *time.Time   `json:"completed_at,omitempty"`
}

// PayoutListResponse lista de saques com paginação
type PayoutListResponse struct {
	Payouts    []PayoutResponse `json:"payouts"`
	TotalCount int              `json:"total_count"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
}

// CreatePayoutRequest request para criar saque
type CreatePayoutRequest struct {
	Amount     float64    `json:"amount" validate:"required,gt=0"`
	PixKey     string     `json:"pix_key" validate:"required"`
	PixKeyType PixKeyType `json:"pix_key_type" validate:"required,oneof=CPF CNPJ EMAIL PHONE EVP"`
}

// BalanceResponse resposta com saldo disponível
type BalanceResponse struct {
	AvailableBalance float64 `json:"available_balance"`
	LockedBalance    float64 `json:"locked_balance"`
	TotalBalance     float64 `json:"total_balance"`
}

// AdminPayoutListItem item de saque na listagem admin (com nome do colaborador via JOIN)
type AdminPayoutListItem struct {
	ID               string       `json:"id"`
	CollaboratorID   string       `json:"collaborator_id"`
	CollaboratorName string       `json:"collaborator_name"`
	Status           PayoutStatus `json:"status"`
	Value            float64      `json:"value"`
	PixKey           string       `json:"pix_key"`
	PixKeyType       PixKeyType   `json:"pix_key_type"`
	RejectionReason  *string      `json:"rejection_reason,omitempty"`
	RequestedAt      time.Time    `json:"requested_at"`
	ReviewedAt       *time.Time   `json:"reviewed_at,omitempty"`
	CompletedAt      *time.Time   `json:"completed_at,omitempty"`
}

// AdminPayoutListResponse lista de saques para admin com paginacao
type AdminPayoutListResponse struct {
	Withdrawals []AdminPayoutListItem `json:"withdrawals"`
	Total       int                   `json:"total"`
	Page        int                   `json:"page"`
	PageSize    int                   `json:"page_size"`
	TotalPages  int                   `json:"total_pages"`
}

// RejectPayoutRequest body do request de rejeicao de saque
type RejectPayoutRequest struct {
	Reason string `json:"reason"`
}

// StudentChargeListItem item de cobranca na listagem do aluno (JOIN com orders e services)
type StudentChargeListItem struct {
	ID          string       `json:"id"`
	OrderID     string       `json:"order_id"`
	ServiceName string       `json:"service_name"`
	Status      ChargeStatus `json:"status"`
	BillingType BillingType  `json:"billing_type"`
	Value       float64      `json:"value"`
	InvoiceURL  *string      `json:"invoice_url,omitempty"`
	PixQRCode   *string      `json:"pix_qr_code,omitempty"`
	PixPayload  *string      `json:"pix_payload,omitempty"`
	BankSlipURL *string      `json:"bank_slip_url,omitempty"`
	DueDate     time.Time    `json:"due_date"`
	PaidAt      *time.Time   `json:"paid_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

// StudentChargeListResponse lista de cobrancas do aluno com paginacao
type StudentChargeListResponse struct {
	Charges    []StudentChargeListItem `json:"charges"`
	Total      int                     `json:"total"`
	Page       int                     `json:"page"`
	PageSize   int                     `json:"page_size"`
	TotalPages int                     `json:"total_pages"`
}

// UserWithdrawalLimitsResponse limites de saque + uso diario do colaborador
type UserWithdrawalLimitsResponse struct {
	MinAmount  float64 `json:"min_amount"`
	MaxAmount  float64 `json:"max_amount"`
	DailyLimit float64 `json:"daily_limit"`
	DailyUsed  float64 `json:"daily_used"`
}
