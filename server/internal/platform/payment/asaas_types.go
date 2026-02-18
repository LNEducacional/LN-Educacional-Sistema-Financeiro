package payment

import "time"

// BillingType representa o tipo de cobrança
type BillingType string

const (
	BillingTypePIX        BillingType = "PIX"
	BillingTypeBoleto     BillingType = "BOLETO"
	BillingTypeCreditCard BillingType = "CREDIT_CARD"
)

// PaymentStatus representa o status de uma cobrança ASAAS
type PaymentStatus string

const (
	PaymentStatusPending           PaymentStatus = "PENDING"
	PaymentStatusReceived          PaymentStatus = "RECEIVED"
	PaymentStatusConfirmed         PaymentStatus = "CONFIRMED"
	PaymentStatusOverdue           PaymentStatus = "OVERDUE"
	PaymentStatusRefunded          PaymentStatus = "REFUNDED"
	PaymentStatusReceivedInCash    PaymentStatus = "RECEIVED_IN_CASH"
	PaymentStatusRefundRequested   PaymentStatus = "REFUND_REQUESTED"
	PaymentStatusChargebackRequested PaymentStatus = "CHARGEBACK_REQUESTED"
	PaymentStatusChargebackDispute PaymentStatus = "CHARGEBACK_DISPUTE"
	PaymentStatusAwaitingChargeback PaymentStatus = "AWAITING_CHARGEBACK_REVERSAL"
	PaymentStatusDunningRequested  PaymentStatus = "DUNNING_REQUESTED"
	PaymentStatusDunningReceived   PaymentStatus = "DUNNING_RECEIVED"
	PaymentStatusAwaitingRiskAnalysis PaymentStatus = "AWAITING_RISK_ANALYSIS"
)

// TransferStatus representa o status de uma transferência ASAAS
type TransferStatus string

const (
	TransferStatusPending        TransferStatus = "PENDING"
	TransferStatusBankProcessing TransferStatus = "BANK_PROCESSING"
	TransferStatusDone           TransferStatus = "DONE"
	TransferStatusCancelled      TransferStatus = "CANCELLED"
	TransferStatusFailed         TransferStatus = "FAILED"
)

// PixKeyType representa o tipo de chave PIX
type PixKeyType string

const (
	PixKeyTypeCPF   PixKeyType = "CPF"
	PixKeyTypeCNPJ  PixKeyType = "CNPJ"
	PixKeyTypeEmail PixKeyType = "EMAIL"
	PixKeyTypePhone PixKeyType = "PHONE"
	PixKeyTypeEVP   PixKeyType = "EVP"
)

// ----- Request Types -----

// CreateCustomerRequest para POST /customers
type CreateCustomerRequest struct {
	Name                 string  `json:"name"`
	Email                string  `json:"email"`
	CpfCnpj              string  `json:"cpfCnpj,omitempty"`
	Phone                string  `json:"phone,omitempty"`
	MobilePhone          string  `json:"mobilePhone,omitempty"`
	ExternalReference    string  `json:"externalReference,omitempty"`
	NotificationDisabled bool    `json:"notificationDisabled,omitempty"`
}

// CreatePaymentRequest para POST /payments
type CreatePaymentRequest struct {
	Customer          string      `json:"customer"`
	BillingType       BillingType `json:"billingType"`
	Value             float64     `json:"value"`
	DueDate           string      `json:"dueDate"` // YYYY-MM-DD
	Description       string      `json:"description,omitempty"`
	ExternalReference string      `json:"externalReference,omitempty"`
	// Credit card fields
	CreditCard        *CreditCardInfo    `json:"creditCard,omitempty"`
	CreditCardHolderInfo *CreditCardHolder `json:"creditCardHolderInfo,omitempty"`
}

// CreditCardInfo para pagamentos com cartão
type CreditCardInfo struct {
	HolderName  string `json:"holderName"`
	Number      string `json:"number"`
	ExpiryMonth string `json:"expiryMonth"`
	ExpiryYear  string `json:"expiryYear"`
	Ccv         string `json:"ccv"`
}

// CreditCardHolder para dados do titular do cartão
type CreditCardHolder struct {
	Name          string `json:"name"`
	Email         string `json:"email"`
	CpfCnpj       string `json:"cpfCnpj"`
	PostalCode    string `json:"postalCode"`
	AddressNumber string `json:"addressNumber"`
	Phone         string `json:"phone,omitempty"`
}

// CreateTransferRequest para POST /transfers
type CreateTransferRequest struct {
	Value           float64    `json:"value"`
	PixAddressKey   string     `json:"pixAddressKey"`
	PixAddressKeyType PixKeyType `json:"pixAddressKeyType"`
	Description     string     `json:"description,omitempty"`
	ScheduleDate    string     `json:"scheduleDate,omitempty"` // YYYY-MM-DD
}

// RefundRequest para POST /payments/{id}/refund
type RefundRequest struct {
	Value       float64 `json:"value,omitempty"`
	Description string  `json:"description,omitempty"`
}

// ----- Response Types -----

// CustomerResponse de GET/POST /customers
type CustomerResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	CpfCnpj           string `json:"cpfCnpj"`
	Phone             string `json:"phone"`
	MobilePhone       string `json:"mobilePhone"`
	ExternalReference string `json:"externalReference"`
	Deleted           bool   `json:"deleted"`
	DateCreated       string `json:"dateCreated"`
}

// PaymentResponse de GET/POST /payments
type PaymentResponse struct {
	ID                string        `json:"id"`
	Customer          string        `json:"customer"`
	Value             float64       `json:"value"`
	NetValue          float64       `json:"netValue"`
	Status            PaymentStatus `json:"status"`
	BillingType       BillingType   `json:"billingType"`
	DueDate           string        `json:"dueDate"`
	PaymentDate       string        `json:"paymentDate,omitempty"`
	ClientPaymentDate string        `json:"clientPaymentDate,omitempty"`
	InvoiceURL        string        `json:"invoiceUrl"`
	BankSlipURL       string        `json:"bankSlipUrl,omitempty"`
	TransactionReceiptURL string    `json:"transactionReceiptUrl,omitempty"`
	ExternalReference string        `json:"externalReference"`
	Description       string        `json:"description"`
	DateCreated       string        `json:"dateCreated"`
	// Credit card specific
	CreditCard        *CreditCardResponse `json:"creditCard,omitempty"`
}

// CreditCardResponse para dados do cartão na resposta
type CreditCardResponse struct {
	CreditCardNumber string `json:"creditCardNumber"`
	CreditCardBrand  string `json:"creditCardBrand"`
	CreditCardToken  string `json:"creditCardToken"`
}

// PixQRCodeResponse de GET /payments/{id}/pixQrCode
type PixQRCodeResponse struct {
	EncodedImage   string    `json:"encodedImage"`
	Payload        string    `json:"payload"`
	ExpirationDate time.Time `json:"expirationDate"`
}

// TransferResponse de GET/POST /transfers
type TransferResponse struct {
	ID              string         `json:"id"`
	Value           float64        `json:"value"`
	NetValue        float64        `json:"netValue"`
	Status          TransferStatus `json:"status"`
	TransferFee     float64        `json:"transferFee"`
	PixAddressKey   string         `json:"pixAddressKey"`
	PixAddressKeyType string       `json:"pixAddressKeyType"`
	Description     string         `json:"description"`
	DateCreated     string         `json:"dateCreated"`
	ScheduleDate    string         `json:"scheduleDate,omitempty"`
	EffectiveDate   string         `json:"effectiveDate,omitempty"`
	FailReason      string         `json:"failReason,omitempty"`
}

// BalanceResponse de GET /finance/balance
type BalanceResponse struct {
	Balance float64 `json:"balance"`
}

// RefundResponse de POST /payments/{id}/refund
type RefundResponse struct {
	ID          string  `json:"id"`
	Value       float64 `json:"value"`
	Status      string  `json:"status"`
	DateCreated string  `json:"dateCreated"`
}

// ----- Webhook Types -----

// WebhookEvent representa um evento recebido do ASAAS
type WebhookEvent struct {
	ID       string                 `json:"id"`
	Event    string                 `json:"event"`
	Payment  *PaymentWebhookPayload `json:"payment,omitempty"`
	Transfer *TransferWebhookPayload `json:"transfer,omitempty"`
}

// PaymentWebhookPayload dados do pagamento no webhook
type PaymentWebhookPayload struct {
	ID                string  `json:"id"`
	Customer          string  `json:"customer"`
	Value             float64 `json:"value"`
	NetValue          float64 `json:"netValue"`
	Status            string  `json:"status"`
	BillingType       string  `json:"billingType"`
	ExternalReference string  `json:"externalReference"`
	PaymentDate       string  `json:"paymentDate,omitempty"`
}

// TransferWebhookPayload dados da transferência no webhook
type TransferWebhookPayload struct {
	ID            string  `json:"id"`
	Value         float64 `json:"value"`
	NetValue      float64 `json:"netValue"`
	Status        string  `json:"status"`
	TransferFee   float64 `json:"transferFee"`
	EffectiveDate string  `json:"effectiveDate,omitempty"`
	FailReason    string  `json:"failReason,omitempty"`
}

// ----- Error Types -----

// AsaasError representa um erro retornado pela API ASAAS
type AsaasError struct {
	Errors []AsaasErrorDetail `json:"errors"`
}

// AsaasErrorDetail detalhe de erro ASAAS
type AsaasErrorDetail struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

func (e *AsaasError) Error() string {
	if len(e.Errors) > 0 {
		return e.Errors[0].Description
	}
	return "unknown ASAAS error"
}

// ----- List Response Types -----

// ListCustomersResponse para GET /customers
type ListCustomersResponse struct {
	Object     string             `json:"object"`
	HasMore    bool               `json:"hasMore"`
	TotalCount int                `json:"totalCount"`
	Limit      int                `json:"limit"`
	Offset     int                `json:"offset"`
	Data       []CustomerResponse `json:"data"`
}

// ListPaymentsResponse para GET /payments
type ListPaymentsResponse struct {
	Object     string            `json:"object"`
	HasMore    bool              `json:"hasMore"`
	TotalCount int               `json:"totalCount"`
	Limit      int               `json:"limit"`
	Offset     int               `json:"offset"`
	Data       []PaymentResponse `json:"data"`
}
