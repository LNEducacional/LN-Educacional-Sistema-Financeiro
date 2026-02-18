package notifications

import (
	"context"
	"fmt"
	"sync"

	"financial-system/internal/platform/events"
)

// ServiceLayer encapsula a lógica de negócio de notificações
type ServiceLayer struct {
	repo        *Repository
	subscribers map[string][]chan *Notification // userID -> canais SSE
	mu          sync.RWMutex
}

// NewServiceLayer cria uma nova instância de ServiceLayer
func NewServiceLayer(repo *Repository) *ServiceLayer {
	return &ServiceLayer{
		repo:        repo,
		subscribers: make(map[string][]chan *Notification),
	}
}

// CreateNotification cria uma nova notificação e notifica subscribers via SSE
func (s *ServiceLayer) CreateNotification(ctx context.Context, req *CreateNotificationRequest) (*Notification, error) {
	notification, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("create notification: %w", err)
	}

	// Enviar para subscribers SSE
	s.notifySubscribers(req.UserID, notification)

	return notification, nil
}

// GetUserNotifications retorna notificações do usuário com filtros
func (s *ServiceLayer) GetUserNotifications(ctx context.Context, userID string, limit, offset int, unreadOnly bool, notificationType *NotificationType) ([]*Notification, error) {
	filters := NotificationFilters{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	}

	if unreadOnly {
		isRead := false
		filters.IsRead = &isRead
	}

	if notificationType != nil {
		filters.Type = notificationType
	}

	return s.repo.GetByFilters(ctx, filters)
}

// MarkAsRead marca notificações como lidas
func (s *ServiceLayer) MarkAsRead(ctx context.Context, userID string, notificationIDs []string) error {
	// Validar que todas as notificações pertencem ao usuário
	for _, id := range notificationIDs {
		notification, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return fmt.Errorf("notification %s: %w", id, err)
		}
		if notification.UserID != userID {
			return fmt.Errorf("notificação %s não pertence ao usuário", id)
		}
	}

	return s.repo.MarkAsRead(ctx, notificationIDs)
}

// MarkAllAsRead marca todas as notificações do usuário como lidas
func (s *ServiceLayer) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}

// GetStats retorna estatísticas de notificações do usuário
func (s *ServiceLayer) GetStats(ctx context.Context, userID string) (*NotificationStats, error) {
	return s.repo.GetStats(ctx, userID)
}

// Subscribe registra um canal SSE para receber notificações em tempo real
func (s *ServiceLayer) Subscribe(userID string) chan *Notification {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan *Notification, 10) // Buffer de 10 notificações
	s.subscribers[userID] = append(s.subscribers[userID], ch)

	return ch
}

// Unsubscribe remove um canal SSE
func (s *ServiceLayer) Unsubscribe(userID string, ch chan *Notification) {
	s.mu.Lock()
	defer s.mu.Unlock()

	channels := s.subscribers[userID]
	for i, c := range channels {
		if c == ch {
			close(c)
			s.subscribers[userID] = append(channels[:i], channels[i+1:]...)
			break
		}
	}

	// Limpar se não houver mais subscribers
	if len(s.subscribers[userID]) == 0 {
		delete(s.subscribers, userID)
	}
}

// notifySubscribers envia notificação para todos os subscribers do usuário
func (s *ServiceLayer) notifySubscribers(userID string, notification *Notification) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	channels := s.subscribers[userID]
	for _, ch := range channels {
		select {
		case ch <- notification:
			// Notificação enviada
		default:
			// Canal cheio, ignorar (evita bloqueio)
		}
	}
}

// --- Event Handlers (integração com event dispatcher) ---

// Handle implementa events.EventHandler para processar eventos e criar notificações
func (s *ServiceLayer) Handle(ctx context.Context, event events.Event) error {
	switch event.Type {
	case events.EventOrderCreated:
		return s.handleOrderCreated(ctx, event)
	case events.EventOrderStatusChanged:
		return s.handleOrderStatusChanged(ctx, event)
	case events.EventDeliveryUploaded:
		return s.handleDeliveryUploaded(ctx, event)
	case events.EventPaymentReleased:
		return s.handlePaymentReleased(ctx, event)
	case events.EventDisputeOpened:
		return s.handleDisputeOpened(ctx, event)
	case events.EventDisputeCommentAdded:
		return s.handleDisputeMessage(ctx, event)
	case events.EventDisputeResolved:
		return s.handleDisputeResolved(ctx, event)
	default:
		// Evento não tratado
		return nil
	}
}

func (s *ServiceLayer) handleOrderCreated(ctx context.Context, event events.Event) error {
	collaboratorID, ok := event.Payload["collaborator_id"].(string)
	if !ok {
		return nil
	}

	orderID, _ := event.Payload["order_id"].(string)
	title := "Novo Pedido Atribuído"
	message := "Você recebeu um novo pedido para produção."

	req := &CreateNotificationRequest{
		UserID:            collaboratorID,
		Type:              NotificationOrderCreated,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("order"),
		RelatedEntityID:   stringPtr(orderID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handleOrderStatusChanged(ctx context.Context, event events.Event) error {
	userID, ok := event.Payload["user_id"].(string)
	if !ok {
		return nil
	}

	orderID, _ := event.Payload["order_id"].(string)
	newStatus, _ := event.Payload["new_status"].(string)

	title := "Status do Pedido Atualizado"
	message := fmt.Sprintf("O status do pedido foi alterado para: %s", newStatus)

	req := &CreateNotificationRequest{
		UserID:            userID,
		Type:              NotificationOrderStatusChanged,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("order"),
		RelatedEntityID:   stringPtr(orderID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handleDeliveryUploaded(ctx context.Context, event events.Event) error {
	studentID, ok := event.Payload["student_id"].(string)
	if !ok {
		return nil
	}

	orderID, _ := event.Payload["order_id"].(string)
	title := "Entrega Disponível para Visualização"
	message := "O colaborador enviou a entrega do seu pedido para visualização."

	req := &CreateNotificationRequest{
		UserID:            studentID,
		Type:              NotificationDeliveryUploaded,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("order"),
		RelatedEntityID:   stringPtr(orderID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handlePaymentReleased(ctx context.Context, event events.Event) error {
	collaboratorID, ok := event.Payload["collaborator_id"].(string)
	if !ok {
		return nil
	}

	orderID, _ := event.Payload["order_id"].(string)
	amount, _ := event.Payload["amount"].(float64)

	title := "Pagamento Liberado"
	message := fmt.Sprintf("Pagamento de R$ %.2f foi creditado em sua carteira.", amount)

	req := &CreateNotificationRequest{
		UserID:            collaboratorID,
		Type:              NotificationPaymentReleased,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("order"),
		RelatedEntityID:   stringPtr(orderID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handleDisputeOpened(ctx context.Context, event events.Event) error {
	collaboratorID, ok := event.Payload["collaborator_id"].(string)
	if !ok {
		return nil
	}

	disputeID, _ := event.Payload["dispute_id"].(string)
	title := "Nova Disputa Aberta"
	message := "Uma disputa foi aberta em um de seus pedidos."

	req := &CreateNotificationRequest{
		UserID:            collaboratorID,
		Type:              NotificationDisputeOpened,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("dispute"),
		RelatedEntityID:   stringPtr(disputeID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handleDisputeMessage(ctx context.Context, event events.Event) error {
	recipientID, ok := event.Payload["recipient_id"].(string)
	if !ok {
		return nil
	}

	disputeID, _ := event.Payload["dispute_id"].(string)
	senderName, _ := event.Payload["sender_name"].(string)

	title := "Nova Mensagem na Disputa"
	message := fmt.Sprintf("%s enviou uma nova mensagem na disputa.", senderName)

	req := &CreateNotificationRequest{
		UserID:            recipientID,
		Type:              NotificationDisputeMessage,
		Title:             title,
		Message:           message,
		RelatedEntityType: stringPtr("dispute"),
		RelatedEntityID:   stringPtr(disputeID),
	}

	_, err := s.CreateNotification(ctx, req)
	return err
}

func (s *ServiceLayer) handleDisputeResolved(ctx context.Context, event events.Event) error {
	// Notificar ambas as partes
	studentID, _ := event.Payload["student_id"].(string)
	collaboratorID, _ := event.Payload["collaborator_id"].(string)
	disputeID, _ := event.Payload["dispute_id"].(string)
	resolution, _ := event.Payload["resolution"].(string)

	title := "Disputa Resolvida"
	message := fmt.Sprintf("A disputa foi resolvida: %s", resolution)

	for _, userID := range []string{studentID, collaboratorID} {
		if userID == "" {
			continue
		}

		req := &CreateNotificationRequest{
			UserID:            userID,
			Type:              NotificationDisputeResolved,
			Title:             title,
			Message:           message,
			RelatedEntityType: stringPtr("dispute"),
			RelatedEntityID:   stringPtr(disputeID),
		}

		_, _ = s.CreateNotification(ctx, req)
	}

	return nil
}

// Helper: ponteiro de string
func stringPtr(s string) *string {
	return &s
}
