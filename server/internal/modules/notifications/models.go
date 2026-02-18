package notifications

import "time"

// NotificationType representa os tipos de notificação do sistema
type NotificationType string

const (
	NotificationOrderCreated        NotificationType = "ORDER_CREATED"
	NotificationOrderStatusChanged  NotificationType = "ORDER_STATUS_CHANGED"
	NotificationDeliveryUploaded    NotificationType = "DELIVERY_UPLOADED"
	NotificationPaymentReleased     NotificationType = "PAYMENT_RELEASED"
	NotificationDisputeOpened       NotificationType = "DISPUTE_OPENED"
	NotificationDisputeMessage      NotificationType = "DISPUTE_MESSAGE"
	NotificationDisputeResolved     NotificationType = "DISPUTE_RESOLVED"
	NotificationRevisionRequested   NotificationType = "REVISION_REQUESTED"
	NotificationApprovalReceived    NotificationType = "APPROVAL_RECEIVED"
	NotificationDeadlineApproaching NotificationType = "DEADLINE_APPROACHING"
	NotificationPaymentPending      NotificationType = "PAYMENT_PENDING"
)

// Notification representa uma notificação do sistema
type Notification struct {
	ID                string           `json:"id"`
	UserID            string           `json:"user_id"`
	Type              NotificationType `json:"type"`
	Title             string           `json:"title"`
	Message           string           `json:"message"`
	RelatedEntityType *string          `json:"related_entity_type,omitempty"`
	RelatedEntityID   *string          `json:"related_entity_id,omitempty"`
	IsRead            bool             `json:"is_read"`
	CreatedAt         time.Time        `json:"created_at"`
	ReadAt            *time.Time       `json:"read_at,omitempty"`
}

// CreateNotificationRequest representa os dados para criar uma notificação
type CreateNotificationRequest struct {
	UserID            string           `json:"user_id"`
	Type              NotificationType `json:"type"`
	Title             string           `json:"title"`
	Message           string           `json:"message"`
	RelatedEntityType *string          `json:"related_entity_type,omitempty"`
	RelatedEntityID   *string          `json:"related_entity_id,omitempty"`
}

// NotificationFilters representa os filtros para buscar notificações
type NotificationFilters struct {
	UserID            string
	IsRead            *bool
	Type              *NotificationType
	RelatedEntityType *string
	RelatedEntityID   *string
	Limit             int
	Offset            int
}

// MarkAsReadRequest representa os dados para marcar notificações como lidas
type MarkAsReadRequest struct {
	NotificationIDs []string `json:"notification_ids"`
}

// NotificationStats representa estatísticas de notificações do usuário
type NotificationStats struct {
	UnreadCount int `json:"unread_count"`
	TotalCount  int `json:"total_count"`
}
