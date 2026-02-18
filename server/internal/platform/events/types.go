package events

import (
	"context"
	"time"
)

// EventType enumera tipos de eventos do sistema
type EventType string

const (
	EventOrderCreated         EventType = "order.created"
	EventOrderStatusChanged   EventType = "order.status_changed"
	EventDeliveryUploaded     EventType = "order.delivery_uploaded"
	EventPaymentReleased      EventType = "order.payment_released"
	EventDisputeOpened        EventType = "dispute.opened"
	EventDisputeResolved      EventType = "dispute.resolved"
	EventDisputeCommentAdded  EventType = "dispute.comment_added"
	EventEvidenceUploaded     EventType = "dispute.evidence_uploaded"
)

// Event representa um evento do sistema
type Event struct {
	Type      EventType              `json:"type"`
	Payload   map[string]interface{} `json:"payload"`
	UserID    string                 `json:"user_id"`      // Quem disparou o evento
	TargetIDs []string               `json:"target_ids"`   // Quem deve receber notificação
	Timestamp time.Time              `json:"timestamp"`
}

// EventHandler é a interface para handlers de eventos
type EventHandler interface {
	Handle(ctx context.Context, event Event) error
}
