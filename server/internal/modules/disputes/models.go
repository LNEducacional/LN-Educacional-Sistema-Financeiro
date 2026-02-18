package disputes

import "time"

// DisputeStatus representa os status de uma disputa
type DisputeStatus string

const (
	DisputeStatusAberta              DisputeStatus = "ABERTA"
	DisputeStatusEmAnalise           DisputeStatus = "EM_ANALISE"
	DisputeStatusAguardandoResposta DisputeStatus = "AGUARDANDO_RESPOSTA"
	DisputeStatusResolvida           DisputeStatus = "RESOLVIDA"
	DisputeStatusCancelada           DisputeStatus = "CANCELADA"
)

// DisputeResolution representa o resultado da resolução
type DisputeResolution string

const (
	DisputeResolutionFavorAluno       DisputeResolution = "FAVOR_ALUNO"
	DisputeResolutionFavorColaborador DisputeResolution = "FAVOR_COLABORADOR"
	DisputeResolutionAcordo           DisputeResolution = "ACORDO"
	DisputeResolutionParcial          DisputeResolution = "PARCIAL"
)

// Dispute representa uma disputa formal
type Dispute struct {
	ID               string             `json:"id"`
	OrderID          string             `json:"order_id"`
	OpenedByUserID   string             `json:"opened_by_user_id"`
	OpenedByRole     string             `json:"opened_by_role"`
	Status           DisputeStatus      `json:"status"`
	Title            string             `json:"title"`
	Description      string             `json:"description"`
	Resolution       *DisputeResolution `json:"resolution,omitempty"`
	ResolutionNotes  *string            `json:"resolution_notes,omitempty"`
	ResolvedByAdminID *string           `json:"resolved_by_admin_id,omitempty"`
	ResolvedAt       *time.Time         `json:"resolved_at,omitempty"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
}

// DisputeComment representa um comentário na thread da disputa
type DisputeComment struct {
	ID         string    `json:"id"`
	DisputeID  string    `json:"dispute_id"`
	UserID     string    `json:"user_id"`
	UserRole   string    `json:"user_role"`
	Comment    string    `json:"comment"`
	IsInternal bool      `json:"is_internal"`
	CreatedAt  time.Time `json:"created_at"`
}

// DisputeEvidence representa uma evidência (arquivo) anexada
type DisputeEvidence struct {
	ID               string    `json:"id"`
	DisputeID        string    `json:"dispute_id"`
	UploadedByUserID string    `json:"uploaded_by_user_id"`
	UploadedByRole   string    `json:"uploaded_by_role"`
	FileName         string    `json:"file_name"`
	FilePath         string    `json:"file_path"`
	FileType         string    `json:"file_type"`
	FileSize         int       `json:"file_size"`
	Description      *string   `json:"description,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// CreateDisputeRequest representa os dados para criar uma disputa
type CreateDisputeRequest struct {
	OrderID     string `json:"order_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// AddCommentRequest representa os dados para adicionar um comentário
type AddCommentRequest struct {
	Comment    string `json:"comment"`
	IsInternal bool   `json:"is_internal"`
}

// ResolveDisputeRequest representa os dados para resolver uma disputa
type ResolveDisputeRequest struct {
	Resolution      DisputeResolution `json:"resolution"`
	ResolutionNotes string            `json:"resolution_notes"`
}

// UploadEvidenceRequest representa os dados para upload de evidência
type UploadEvidenceRequest struct {
	FileName    string  `json:"file_name"`
	FilePath    string  `json:"file_path"`
	FileType    string  `json:"file_type"`
	FileSize    int     `json:"file_size"`
	Description *string `json:"description,omitempty"`
}

// DisputeWithDetails representa uma disputa com todas as informações relacionadas
type DisputeWithDetails struct {
	Dispute  Dispute           `json:"dispute"`
	Comments []DisputeComment  `json:"comments"`
	Evidence []DisputeEvidence `json:"evidence"`
}
