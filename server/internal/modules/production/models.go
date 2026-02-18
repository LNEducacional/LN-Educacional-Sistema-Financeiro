package production

import "time"

// ProductionJobStatus representa os estados do trabalho
type ProductionJobStatus string

const (
	StatusNovo                ProductionJobStatus = "NOVO"
	StatusEmAndamento         ProductionJobStatus = "EM_ANDAMENTO"
	StatusAguardandoRevisao   ProductionJobStatus = "AGUARDANDO_REVISAO"
	StatusEnviadoVisualizacao ProductionJobStatus = "ENVIADO_VISUALIZACAO"
	StatusAguardandoAprovacao ProductionJobStatus = "AGUARDANDO_APROVACAO"
	StatusAprovado            ProductionJobStatus = "APROVADO"
	StatusNaoAprovado         ProductionJobStatus = "NAO_APROVADO"
	StatusConcluido           ProductionJobStatus = "CONCLUIDO"
)

// CollaboratorProfile representa o perfil de colaborador
type CollaboratorProfile struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	PixKey          *string   `json:"pix_key,omitempty"`
	Specialty       *string   `json:"specialty,omitempty"`
	InternalRanking float64   `json:"internal_ranking"`
	Active          bool      `json:"active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ProductionJob representa um trabalho de producao
type ProductionJob struct {
	ID                     string              `json:"id"`
	Title                  string              `json:"title"`
	Description            *string             `json:"description,omitempty"`
	Price                  float64             `json:"price"`
	Deadline               time.Time           `json:"deadline"`
	Status                 ProductionJobStatus `json:"status"`
	StudentID              string              `json:"student_id"`
	CollaboratorID         *string             `json:"collaborator_id,omitempty"`
	FinancialTransactionID *string             `json:"financial_transaction_id,omitempty"`
	CreatedAt              time.Time           `json:"created_at"`
	UpdatedAt              time.Time           `json:"updated_at"`
}

// JobHistory representa um registro de auditoria
type JobHistory struct {
	ID              string               `json:"id"`
	JobID           string               `json:"job_id"`
	PreviousStatus  *ProductionJobStatus `json:"previous_status,omitempty"`
	NewStatus       ProductionJobStatus  `json:"new_status"`
	ChangedByUserID string               `json:"changed_by_user_id"`
	Comments        *string              `json:"comments,omitempty"`
	CreatedAt       time.Time            `json:"created_at"`
}
