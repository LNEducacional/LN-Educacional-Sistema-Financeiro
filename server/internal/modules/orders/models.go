package orders

import (
	"time"

	"financial-system/internal/platform/statemachine"
)

type OrderStatus string

const (
	OrderStatusNovo                 OrderStatus = "NOVO"
	OrderStatusEmAndamento          OrderStatus = "EM_ANDAMENTO"
	OrderStatusAguardandoRevisao    OrderStatus = "AGUARDANDO_REVISAO"      // NOVO
	OrderStatusEnviadoVisualizacao  OrderStatus = "ENVIADO_VISUALIZACAO"    // NOVO
	OrderStatusAguardandoAprovacao  OrderStatus = "AGUARDANDO_APROVACAO"    // NOVO
	OrderStatusAprovado             OrderStatus = "APROVADO"                // NOVO
	OrderStatusRevisaoSolicitada    OrderStatus = "REVISAO_SOLICITADA"      // NOVO
	OrderStatusEntregue             OrderStatus = "ENTREGUE"                // DEPRECATED (manter compatibilidade)
	OrderStatusConcluido            OrderStatus = "CONCLUIDO"
	OrderStatusAtrasado             OrderStatus = "ATRASADO"
	OrderStatusCancelado            OrderStatus = "CANCELADO"
)

// OrderStateMachine define transições válidas de status usando a state machine genérica
var OrderStateMachine = statemachine.NewStateMachine("OrderStatus", map[OrderStatus][]OrderStatus{
	OrderStatusNovo: {
		OrderStatusEmAndamento,
		OrderStatusCancelado,
		OrderStatusAtrasado,
	},
	OrderStatusEmAndamento: {
		OrderStatusAguardandoRevisao,
		OrderStatusEnviadoVisualizacao,
		OrderStatusAtrasado,
		OrderStatusCancelado,
	},
	OrderStatusAguardandoRevisao: {
		OrderStatusEmAndamento,
		OrderStatusEnviadoVisualizacao,
		OrderStatusAtrasado,
		OrderStatusCancelado,
	},
	OrderStatusEnviadoVisualizacao: {
		OrderStatusAguardandoAprovacao,
		OrderStatusCancelado,
	},
	OrderStatusAguardandoAprovacao: {
		OrderStatusAprovado,
		OrderStatusRevisaoSolicitada,
		OrderStatusCancelado,
	},
	OrderStatusRevisaoSolicitada: {
		OrderStatusEmAndamento,
		OrderStatusCancelado,
	},
	OrderStatusAprovado: {
		OrderStatusConcluido,
	},
	OrderStatusAtrasado: {
		OrderStatusEmAndamento,
		OrderStatusCancelado,
	},
	// Estados finais não têm transições
	OrderStatusConcluido: {},
	OrderStatusCancelado: {},
	OrderStatusEntregue:  {}, // deprecated
})

type PaymentStatus string

const (
	PaymentStatusLocked   PaymentStatus = "LOCKED"
	PaymentStatusReleased PaymentStatus = "RELEASED"
	PaymentStatusRefunded PaymentStatus = "REFUNDED"
)

type Order struct {
	ID             string        `json:"id"`
	StudentID      string        `json:"student_id"`
	CollaboratorID string        `json:"collaborator_id"`
	ServiceID      string        `json:"service_id"`
	Status         OrderStatus   `json:"status"`
	PaymentStatus  PaymentStatus `json:"payment_status"`
	// Snapshot values (immutable after creation)
	TotalValue    float64   `json:"total_value"`
	CompanyPercent int       `json:"company_percent"`
	CollabPercent  int       `json:"collab_percent"`
	CollabValue    float64   `json:"collab_value"`
	DueDate        time.Time `json:"due_date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateOrderInput struct {
	ServiceID      string    `json:"service_id"`
	CollaboratorID string    `json:"collaborator_id"`
	DueDate        time.Time `json:"due_date"`
}

type OrderWithDetails struct {
	Order
	ServiceName      string `json:"service_name"`
	StudentName      string `json:"student_name"`
	CollaboratorName string `json:"collaborator_name"`
}

// CollaboratorOrderView is the view for collaborator dashboard
// Exposes all financial details including total_value and percentages
type CollaboratorOrderView struct {
	ID             string        `json:"id"`
	StudentName    string        `json:"student_name"`
	ServiceName    string        `json:"service_name"`
	MyShare        float64       `json:"my_share"`
	TotalValue     float64       `json:"total_value"`
	CompanyPercent int           `json:"company_percent"`
	CollabPercent  int           `json:"collab_percent"`
	CompanyValue   float64       `json:"company_value"`
	Status         OrderStatus   `json:"status"`
	PaymentStatus  PaymentStatus `json:"payment_status"`
	DueDate        time.Time     `json:"due_date"`
	RevisionCount  int           `json:"revision_count"`
}

// Delivery represents a file delivery for an order
type Delivery struct {
	ID           string    `json:"id"`
	OrderID      string    `json:"order_id"`
	FilePath     string    `json:"file_path"`
	OriginalName string    `json:"original_name"`
	MimeType     string    `json:"mime_type"`
	FileSize     int64     `json:"file_size"`
	CreatedAt    time.Time `json:"created_at"`
}

// CreateDeliveryInput is the input for creating a delivery
type CreateDeliveryInput struct {
	OrderID      string
	FilePath     string
	OriginalName string
	MimeType     string
	FileSize     int64
}

// OrderRevision represents a revision request from student
type OrderRevision struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateRevisionInput is the input for creating a revision
type CreateRevisionInput struct {
	OrderID string
	Reason  string
}

// StudentOrderView for student dashboard (shows total_value, appropriate for student)
type StudentOrderView struct {
	ID               string      `json:"id"`
	CollaboratorName string      `json:"collaborator_name"`
	ServiceName      string      `json:"service_name"`
	TotalValue       float64     `json:"total_value"`
	Status           OrderStatus `json:"status"`
	DueDate          time.Time   `json:"due_date"`
}

// ServiceInfo for order details response
type ServiceInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// CollaboratorInfo for order details response
type CollaboratorInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// OrderDetailsResponse for student order detail page
type OrderDetailsResponse struct {
	Order        Order            `json:"order"`
	Service      ServiceInfo      `json:"service"`
	Collaborator CollaboratorInfo `json:"collaborator"`
	Deliveries   []Delivery       `json:"deliveries"`
	Revisions    []OrderRevision  `json:"revisions"`
}

// CreateRatingInput is the input for creating a rating
type CreateRatingInput struct {
	OrderID        string
	StudentID      string
	CollaboratorID string
	Score          int
	Comment        *string
}

// OrderStatusHistory representa o histórico de mudanças de status
type OrderStatusHistory struct {
	ID              string       `json:"id"`
	OrderID         string       `json:"order_id"`
	PreviousStatus  *OrderStatus `json:"previous_status,omitempty"` // null para primeiro status
	NewStatus       OrderStatus  `json:"new_status"`
	ChangedByUserID string       `json:"changed_by_user_id"`
	ChangedByRole   string       `json:"changed_by_role"`
	Comments        *string      `json:"comments,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

// InternalReviewRequest representa uma solicitação de revisão interna
type InternalReviewRequest struct {
	OrderID string  `json:"order_id"`
	Notes   *string `json:"notes,omitempty"`
}

// ChangeStatusRequest representa uma solicitação de mudança de status
type ChangeStatusRequest struct {
	NewStatus OrderStatus `json:"new_status"`
	Comments  *string     `json:"comments,omitempty"`
}

// PaymentInfo informações de pagamento ASAAS
type PaymentInfo struct {
	InvoiceURL  string `json:"invoice_url"`
	PixQRCode   string `json:"pix_qr_code,omitempty"`
	PixPayload  string `json:"pix_payload,omitempty"`
	BankSlipURL string `json:"bank_slip_url,omitempty"`
	DueDate     string `json:"due_date"`
	Status      string `json:"status"`
}

// CreateOrderResponse resposta da criação de pedido com info de pagamento
type CreateOrderResponse struct {
	Order       *Order       `json:"order"`
	PaymentInfo *PaymentInfo `json:"payment_info,omitempty"`
}
