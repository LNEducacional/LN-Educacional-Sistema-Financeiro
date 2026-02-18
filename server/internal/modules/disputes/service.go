package disputes

import (
	"context"
	"fmt"

	"financial-system/internal/platform/events"
)

// ServiceLayer encapsula a lógica de negócio de disputas
type ServiceLayer struct {
	repo       *Repository
	dispatcher *events.Dispatcher
}

// NewServiceLayer cria uma nova instância de ServiceLayer
func NewServiceLayer(repo *Repository, dispatcher *events.Dispatcher) *ServiceLayer {
	return &ServiceLayer{
		repo:       repo,
		dispatcher: dispatcher,
	}
}

// CreateDispute cria uma nova disputa e publica evento
func (s *ServiceLayer) CreateDispute(ctx context.Context, req *CreateDisputeRequest, userID, userRole string) (*Dispute, error) {
	dispute, err := s.repo.CreateDispute(ctx, req, userID, userRole)
	if err != nil {
		return nil, fmt.Errorf("create dispute: %w", err)
	}

	// Publicar evento
	event := events.Event{
		Type: events.EventDisputeOpened,
		Payload: map[string]interface{}{
			"dispute_id": dispute.ID,
			"order_id":   dispute.OrderID,
			"opened_by":  userID,
		},
		UserID: userID,
	}
	s.dispatcher.PublishAsync(ctx, event)

	return dispute, nil
}

// GetDisputeWithDetails busca uma disputa com comentários e evidências
func (s *ServiceLayer) GetDisputeWithDetails(ctx context.Context, disputeID, userRole string) (*DisputeWithDetails, error) {
	dispute, err := s.repo.GetByID(ctx, disputeID)
	if err != nil {
		return nil, fmt.Errorf("get dispute: %w", err)
	}

	// Incluir comentários internos para admin e financeiro
	includeInternal := (userRole == "ADMIN" || userRole == "FINANCEIRO")
	comments, err := s.repo.GetComments(ctx, disputeID, includeInternal)
	if err != nil {
		return nil, fmt.Errorf("get comments: %w", err)
	}

	evidence, err := s.repo.GetEvidence(ctx, disputeID)
	if err != nil {
		return nil, fmt.Errorf("get evidence: %w", err)
	}

	return &DisputeWithDetails{
		Dispute:  *dispute,
		Comments: comments,
		Evidence: evidence,
	}, nil
}

// GetDisputesByOrder busca disputas de um pedido
func (s *ServiceLayer) GetDisputesByOrder(ctx context.Context, orderID string) ([]*Dispute, error) {
	return s.repo.GetByOrderID(ctx, orderID)
}

// GetAllDisputes busca todas as disputas (admin only)
func (s *ServiceLayer) GetAllDisputes(ctx context.Context, status *DisputeStatus, limit, offset int) ([]*Dispute, error) {
	return s.repo.GetAll(ctx, status, limit, offset)
}

// AddComment adiciona um comentário e publica evento
func (s *ServiceLayer) AddComment(ctx context.Context, disputeID, userID, userRole string, req *AddCommentRequest) (*DisputeComment, error) {
	// Validar permissão para comentários internos
	if req.IsInternal && userRole != "ADMIN" && userRole != "FINANCEIRO" {
		return nil, fmt.Errorf("apenas admins podem criar comentários internos")
	}

	comment, err := s.repo.AddComment(ctx, disputeID, userID, userRole, req)
	if err != nil {
		return nil, fmt.Errorf("add comment: %w", err)
	}

	// Publicar evento apenas se não for comentário interno
	if !req.IsInternal {
		event := events.Event{
			Type: events.EventDisputeCommentAdded,
			Payload: map[string]interface{}{
				"dispute_id": disputeID,
				"comment_id": comment.ID,
				"user_id":    userID,
			},
			UserID: userID,
		}
		s.dispatcher.PublishAsync(ctx, event)
	}

	return comment, nil
}

// AddEvidence adiciona uma evidência e publica evento
func (s *ServiceLayer) AddEvidence(ctx context.Context, disputeID, userID, userRole string, req *UploadEvidenceRequest) (*DisputeEvidence, error) {
	evidence, err := s.repo.AddEvidence(ctx, disputeID, userID, userRole, req)
	if err != nil {
		return nil, fmt.Errorf("add evidence: %w", err)
	}

	// Publicar evento
	event := events.Event{
		Type: events.EventEvidenceUploaded,
		Payload: map[string]interface{}{
			"dispute_id":  disputeID,
			"evidence_id": evidence.ID,
			"file_name":   evidence.FileName,
		},
		UserID: userID,
	}
	s.dispatcher.PublishAsync(ctx, event)

	return evidence, nil
}

// UpdateStatus atualiza o status da disputa
func (s *ServiceLayer) UpdateStatus(ctx context.Context, disputeID string, status DisputeStatus) error {
	return s.repo.UpdateStatus(ctx, disputeID, status)
}

// ResolveDispute resolve a disputa (admin only) e publica evento
func (s *ServiceLayer) ResolveDispute(ctx context.Context, disputeID, adminID string, req *ResolveDisputeRequest) error {
	// Buscar disputa para obter informações
	dispute, err := s.repo.GetByID(ctx, disputeID)
	if err != nil {
		return fmt.Errorf("get dispute: %w", err)
	}

	err = s.repo.ResolveDispute(ctx, disputeID, adminID, req)
	if err != nil {
		return fmt.Errorf("resolve dispute: %w", err)
	}

	// Publicar evento
	event := events.Event{
		Type: events.EventDisputeResolved,
		Payload: map[string]interface{}{
			"dispute_id": disputeID,
			"order_id":   dispute.OrderID,
			"resolution": req.Resolution,
		},
		UserID: adminID,
	}
	s.dispatcher.PublishAsync(ctx, event)

	return nil
}

// ValidateAccess valida se o usuário tem acesso à disputa
func (s *ServiceLayer) ValidateAccess(ctx context.Context, disputeID, userID, userRole string) error {
	dispute, err := s.repo.GetByID(ctx, disputeID)
	if err != nil {
		return err
	}

	// Admin e Financeiro tem acesso a tudo
	if userRole == "ADMIN" || userRole == "FINANCEIRO" {
		return nil
	}

	// Verificar se o usuário abriu a disputa
	if dispute.OpenedByUserID == userID {
		return nil
	}

	// Verificar se o usuário é parte do pedido (student ou collaborator)
	parties, err := s.repo.GetOrderPartiesByDisputeID(ctx, disputeID)
	if err != nil {
		return fmt.Errorf("validar acesso à disputa: %w", err)
	}

	if parties.StudentID == userID || parties.CollaboratorID == userID {
		return nil
	}

	return fmt.Errorf("acesso negado à disputa")
}
