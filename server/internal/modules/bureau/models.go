package bureau

import "time"

// BureauType represents the type of credit bureau
type BureauType string

const (
	BureauTypeSerasa BureauType = "SERASA"
	BureauTypeSPC    BureauType = "SPC"
)

// SubmissionStatus represents the status of a bureau submission
type SubmissionStatus string

const (
	StatusPending   SubmissionStatus = "PENDING"
	StatusSubmitted SubmissionStatus = "SUBMITTED"
	StatusConfirmed SubmissionStatus = "CONFIRMED"
	StatusFailed    SubmissionStatus = "FAILED"
	StatusCancelled SubmissionStatus = "CANCELLED"
)

// BureauSubmission represents a submission to a credit bureau
type BureauSubmission struct {
	ID              string           `json:"id"`
	UserID          string           `json:"user_id"`
	BureauType      BureauType       `json:"bureau_type"`
	Status          SubmissionStatus `json:"status"`
	TotalOwed       float64          `json:"total_owed"`
	DaysOverdue     int              `json:"days_overdue"`
	SubmittedAt     *time.Time       `json:"submitted_at"`
	ConfirmedAt     *time.Time       `json:"confirmed_at"`
	ExternalID      *string          `json:"external_id"` // ID from bureau API
	ErrorMessage    *string          `json:"error_message"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// SerasaRequest represents the payload for Serasa API
type SerasaRequest struct {
	CPF            string  `json:"cpf"`
	Name           string  `json:"nome"`
	BirthDate      string  `json:"dataNascimento,omitempty"`
	Phone          string  `json:"telefone,omitempty"`
	Email          string  `json:"email,omitempty"`
	AddressZipcode string  `json:"cep,omitempty"`
	AddressStreet  string  `json:"logradouro,omitempty"`
	AddressNumber  string  `json:"numero,omitempty"`
	AddressCity    string  `json:"cidade,omitempty"`
	AddressState   string  `json:"uf,omitempty"`
	DebtAmount     float64 `json:"valorDivida"`
	DueDate        string  `json:"dataVencimento"`
	ContractID     string  `json:"contrato"`
}

// SerasaResponse represents the response from Serasa API
type SerasaResponse struct {
	Success    bool    `json:"success"`
	ProtocolID string  `json:"protocolo,omitempty"`
	Message    string  `json:"mensagem,omitempty"`
	Error      *string `json:"erro,omitempty"`
}

// BureauConfig represents configuration for bureau integration
type BureauConfig struct {
	Enabled           bool   `json:"enabled"`
	APIKey            string `json:"-"` // Never expose in JSON
	APIURL            string `json:"api_url"`
	AutoSubmit        bool   `json:"auto_submit"`
	MinDaysOverdue    int    `json:"min_days_overdue"`    // Minimum days before auto-submit
	MinAmountOwed     float64`json:"min_amount_owed"`     // Minimum amount before auto-submit
}

// SubmissionRequest represents a request to submit to bureau
type SubmissionRequest struct {
	UserID     string     `json:"user_id"`
	BureauType BureauType `json:"bureau_type"`
	Force      bool       `json:"force"` // Force even if already submitted
}

// SubmissionResponse represents the result of a submission attempt
type SubmissionResponse struct {
	Success      bool    `json:"success"`
	SubmissionID string  `json:"submission_id,omitempty"`
	ExternalID   string  `json:"external_id,omitempty"`
	Message      string  `json:"message"`
}

// BureauStats represents statistics about bureau submissions
type BureauStats struct {
	TotalPending   int     `json:"total_pending"`
	TotalSubmitted int     `json:"total_submitted"`
	TotalConfirmed int     `json:"total_confirmed"`
	TotalFailed    int     `json:"total_failed"`
	TotalAmount    float64 `json:"total_amount"`
}
