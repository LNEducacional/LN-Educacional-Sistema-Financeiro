package orders

import (
	"context"
	"errors"
	"financial-system/internal/modules/finance"
	"financial-system/internal/modules/payment"
	"financial-system/internal/modules/services"
	"financial-system/internal/modules/settings"
	"financial-system/internal/platform/events"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidDueDate       = errors.New("due_date must be in the future")
	ErrServiceNotFound      = errors.New("service not found")
	ErrCollaboratorNoWallet = errors.New("collaborator does not have a wallet")
	ErrInvalidOrderStatus   = errors.New("invalid order status for this operation")
	ErrAlreadyRated         = errors.New("order has already been rated")
	ErrBelowMinCharge       = errors.New("valor abaixo do minimo para cobranca")
)

// UserInfoProvider interface para buscar informações do usuário
type UserInfoProvider interface {
	GetUserEmailAndName(ctx context.Context, userID string) (email string, name string, err error)
}

type ServiceLayer struct {
	db              *pgxpool.Pool
	repo            *Repository
	serviceRepo     *services.Repository
	financeRepo     *finance.Repository
	paymentService  payment.Service
	userProvider    UserInfoProvider
	settingsService *settings.Service
	dispatcher      *events.Dispatcher
}

func NewService(db *pgxpool.Pool, repo *Repository, serviceRepo *services.Repository, financeRepo *finance.Repository, settingsService *settings.Service) *ServiceLayer {
	return &ServiceLayer{
		db:              db,
		repo:            repo,
		serviceRepo:     serviceRepo,
		financeRepo:     financeRepo,
		settingsService: settingsService,
	}
}

// SetPaymentService configura o serviço de pagamento (opcional)
func (s *ServiceLayer) SetPaymentService(ps payment.Service, up UserInfoProvider) {
	s.paymentService = ps
	s.userProvider = up
}

// SetEventDispatcher configura o dispatcher de eventos
func (s *ServiceLayer) SetEventDispatcher(d *events.Dispatcher) {
	s.dispatcher = d
}

// Create implements the ACID transaction for order creation with escrow
// Algorithm:
// 1. Begin Transaction
// 2. Get Service (snapshot values)
// 3. Calculate collaborator share
// 4. Create Order with snapshot values, status=NOVO, payment_status=LOCKED
// 5. Credit locked balance to collaborator wallet
// 6. Create transaction record (type=CREDIT, status=LOCKED)
// 7. Commit
// 8. Create ASAAS charge (async, doesn't fail the order)
func (s *ServiceLayer) Create(ctx context.Context, studentID string, input *CreateOrderInput) (*Order, error) {
	// Validate due_date is in the future
	if input.DueDate.Before(time.Now()) {
		return nil, ErrInvalidDueDate
	}

	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Step 2: Get service (snapshot values)
	svc, err := s.serviceRepo.GetByID(ctx, input.ServiceID)
	if err != nil {
		return nil, ErrServiceNotFound
	}

	// Step 3: Calculate collaborator share
	collabValue := svc.TotalValue * (float64(svc.CollaboratorPercent) / 100.0)

	// Step 4: Create Order with snapshot values
	order := &Order{
		StudentID:      studentID,
		CollaboratorID: input.CollaboratorID,
		ServiceID:      input.ServiceID,
		Status:         OrderStatusNovo,
		PaymentStatus:  PaymentStatusLocked,
		TotalValue:     svc.TotalValue,
		CompanyPercent: svc.CompanyPercent,
		CollabPercent:  svc.CollaboratorPercent,
		CollabValue:    collabValue,
		DueDate:        input.DueDate,
	}

	err = s.repo.CreateTx(ctx, tx, order)
	if err != nil {
		return nil, err
	}

	// Step 5: Get collaborator wallet and credit locked balance
	wallet, err := s.financeRepo.GetWalletByUserIDTx(ctx, tx, input.CollaboratorID)
	if err != nil {
		if errors.Is(err, finance.ErrWalletNotFound) {
			return nil, ErrCollaboratorNoWallet
		}
		return nil, err
	}

	err = s.financeRepo.CreditLocked(ctx, tx, input.CollaboratorID, collabValue)
	if err != nil {
		return nil, err
	}

	// Step 6: Create transaction record
	_, err = s.financeRepo.CreateTransaction(ctx, tx, finance.CreateTransactionInput{
		WalletID: wallet.ID,
		OrderID:  &order.ID,
		Amount:   collabValue,
		Type:     finance.TxTypeCredit,
		Status:   finance.TxStatusLocked,
	})
	if err != nil {
		return nil, err
	}

	// Step 7: Commit
	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	// Publicar evento de pedido criado
	if s.dispatcher != nil {
		s.dispatcher.PublishAsync(ctx, events.Event{
			Type: events.EventOrderCreated,
			Payload: map[string]interface{}{
				"order_id":        order.ID,
				"collaborator_id": order.CollaboratorID,
				"student_id":      studentID,
			},
			UserID:    studentID,
			TargetIDs: []string{order.CollaboratorID},
		})
	}

	return order, nil
}

// CreateWithPayment cria pedido e cobrança ASAAS
func (s *ServiceLayer) CreateWithPayment(ctx context.Context, studentID string, input *CreateOrderInput, billingType payment.BillingType) (*CreateOrderResponse, error) {
	// Validar valor minimo de cobranca antes de criar o pedido
	if s.settingsService != nil {
		minAmount, err := s.settingsService.GetChargeMinAmount(ctx)
		if err != nil {
			return nil, fmt.Errorf("erro ao buscar valor minimo de cobranca: %w", err)
		}
		// Buscar o servico para verificar o valor
		svc, err := s.serviceRepo.GetByID(ctx, input.ServiceID)
		if err != nil {
			return nil, ErrServiceNotFound
		}
		if svc.TotalValue < minAmount {
			return nil, fmt.Errorf("%w: valor minimo para cobranca e R$ %.2f", ErrBelowMinCharge, minAmount)
		}
	}

	// Criar pedido normalmente
	order, err := s.Create(ctx, studentID, input)
	if err != nil {
		return nil, err
	}

	response := &CreateOrderResponse{Order: order}

	// Tentar criar cobrança ASAAS (não falha o pedido se não configurado ou erro)
	if s.paymentService != nil && s.paymentService.IsConfigured() && s.userProvider != nil {
		email, name, err := s.userProvider.GetUserEmailAndName(ctx, studentID)
		if err != nil {
			log.Printf("Warning: Failed to get student info for ASAAS charge: %v", err)
			return response, nil
		}

		charge, err := s.paymentService.CreateChargeForOrder(
			ctx,
			order.ID,
			order.TotalValue,
			billingType,
			order.DueDate,
			email,
			name,
		)
		if err != nil {
			log.Printf("Warning: Failed to create ASAAS charge for order %s: %v", order.ID, err)
			return response, nil
		}

		response.PaymentInfo = &PaymentInfo{
			InvoiceURL:  charge.InvoiceURL,
			PixQRCode:   charge.PixQRCode,
			PixPayload:  charge.PixPayload,
			BankSlipURL: charge.BankSlipURL,
			DueDate:     charge.DueDate.Format("2006-01-02"),
			Status:      string(charge.Status),
		}
	}

	return response, nil
}

// GetByID retrieves an order by ID
func (s *ServiceLayer) GetByID(ctx context.Context, id string) (*Order, error) {
	return s.repo.GetByID(ctx, id)
}

// ListByStudentID retrieves all orders for a student
func (s *ServiceLayer) ListByStudentID(ctx context.Context, studentID string) ([]Order, error) {
	orders, err := s.repo.ListByStudentID(ctx, studentID)
	if err != nil {
		return nil, err
	}
	if orders == nil {
		return []Order{}, nil
	}
	return orders, nil
}

// ListByCollaboratorID retrieves all orders for a collaborator
func (s *ServiceLayer) ListByCollaboratorID(ctx context.Context, collaboratorID string) ([]Order, error) {
	orders, err := s.repo.ListByCollaboratorID(ctx, collaboratorID)
	if err != nil {
		return nil, err
	}
	if orders == nil {
		return []Order{}, nil
	}
	return orders, nil
}

// List retrieves all orders (admin view)
func (s *ServiceLayer) List(ctx context.Context) ([]Order, error) {
	orders, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	if orders == nil {
		return []Order{}, nil
	}
	return orders, nil
}

// UpdateStatus updates the order status
func (s *ServiceLayer) UpdateStatus(ctx context.Context, id string, status OrderStatus) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	err = s.repo.UpdateStatusTx(ctx, tx, id, status)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// Deliver marks an order as sent for visualization (new pipeline)
// This transitions the order to ENVIADO_VISUALIZACAO, allowing the student to review
func (s *ServiceLayer) Deliver(ctx context.Context, orderID string, collaboratorID string) error {
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	// Verify collaborator owns this order
	if order.CollaboratorID != collaboratorID {
		return errors.New("order does not belong to this collaborator")
	}

	// Only NOVO, EM_ANDAMENTO, or AGUARDANDO_REVISAO orders can be delivered
	if order.Status != OrderStatusNovo && order.Status != OrderStatusEmAndamento && order.Status != OrderStatusAguardandoRevisao {
		return ErrInvalidOrderStatus
	}

	// Use new pipeline status: ENVIADO_VISUALIZACAO
	return s.UpdateStatus(ctx, orderID, OrderStatusEnviadoVisualizacao)
}

// Approve approves an order and releases payment to collaborator
// This moves balance from locked to available
func (s *ServiceLayer) Approve(ctx context.Context, orderID string, studentID string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	order, err := s.repo.GetByIDTx(ctx, tx, orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	// Verify student owns this order
	if order.StudentID != studentID {
		return errors.New("order does not belong to this student")
	}

	// Orders in AGUARDANDO_APROVACAO or ENTREGUE (legacy) can be approved
	if order.Status != OrderStatusAguardandoAprovacao && order.Status != OrderStatusEntregue {
		return ErrInvalidOrderStatus
	}

	// Update order status
	err = s.repo.UpdateStatusTx(ctx, tx, orderID, OrderStatusConcluido)
	if err != nil {
		return err
	}

	// Update payment status
	err = s.repo.UpdatePaymentStatusTx(ctx, tx, orderID, PaymentStatusReleased)
	if err != nil {
		return err
	}

	// Release locked balance to available
	err = s.financeRepo.ReleaseLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// Publicar eventos após commit
	if s.dispatcher != nil {
		s.dispatcher.PublishAsync(ctx, events.Event{
			Type: events.EventOrderStatusChanged,
			Payload: map[string]interface{}{
				"order_id":   orderID,
				"user_id":    order.CollaboratorID,
				"new_status": string(OrderStatusConcluido),
			},
			UserID:    studentID,
			TargetIDs: []string{order.CollaboratorID},
		})
		s.dispatcher.PublishAsync(ctx, events.Event{
			Type: events.EventPaymentReleased,
			Payload: map[string]interface{}{
				"order_id":        orderID,
				"collaborator_id": order.CollaboratorID,
				"amount":          order.CollabValue,
			},
			UserID:    studentID,
			TargetIDs: []string{order.CollaboratorID},
		})
	}

	return nil
}

// MarkOverdue marks all overdue orders as ATRASADO
func (s *ServiceLayer) MarkOverdue(ctx context.Context) (int64, error) {
	return s.repo.MarkOverdueOrders(ctx)
}

// RequestRevision handles when a student rejects a delivery and requests revision
// Money stays LOCKED, order returns to EM_ANDAMENTO, revision reason is recorded
func (s *ServiceLayer) RequestRevision(ctx context.Context, orderID string, studentID string, reason string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Get order with lock
	order, err := s.repo.GetByIDTx(ctx, tx, orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	// 2. Validate ownership
	if order.StudentID != studentID {
		return errors.New("order does not belong to this student")
	}

	// 3. Validate status is AGUARDANDO_APROVACAO or ENTREGUE (legacy)
	if order.Status != OrderStatusAguardandoAprovacao && order.Status != OrderStatusEntregue {
		return ErrInvalidOrderStatus
	}

	// 4. Create revision record
	_, err = s.repo.CreateRevisionTx(ctx, tx, CreateRevisionInput{
		OrderID: orderID,
		Reason:  reason,
	})
	if err != nil {
		return err
	}

	// 5. Update order status -> EM_ANDAMENTO (restarts work cycle)
	// NOTE: Money stays LOCKED - no financial transaction here
	err = s.repo.UpdateStatusTx(ctx, tx, orderID, OrderStatusEmAndamento)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetOrderDetails retrieves full order details for student view
func (s *ServiceLayer) GetOrderDetails(ctx context.Context, orderID string) (*OrderDetailsResponse, error) {
	return s.repo.GetOrderDetails(ctx, orderID)
}

// ListByStudentWithDetails retrieves orders with details for student dashboard
func (s *ServiceLayer) ListByStudentWithDetails(ctx context.Context, studentID string) ([]StudentOrderView, error) {
	orders, err := s.repo.ListByStudentWithDetails(ctx, studentID)
	if err != nil {
		return nil, err
	}
	if orders == nil {
		return []StudentOrderView{}, nil
	}
	return orders, nil
}

// RateOrder allows a student to rate a completed order
func (s *ServiceLayer) RateOrder(ctx context.Context, orderID, studentID string, score int, comment *string) error {
	// 1. Get order
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		return ErrOrderNotFound
	}

	// 2. Validate ownership
	if order.StudentID != studentID {
		return errors.New("order does not belong to this student")
	}

	// 3. Validate status is CONCLUIDO
	if order.Status != OrderStatusConcluido {
		return ErrInvalidOrderStatus
	}

	// 4. Check if already rated
	exists, err := s.repo.RatingExists(ctx, orderID)
	if err != nil {
		return err
	}
	if exists {
		return ErrAlreadyRated
	}

	// 5. Create rating
	return s.repo.CreateRating(ctx, CreateRatingInput{
		OrderID:        orderID,
		StudentID:      studentID,
		CollaboratorID: order.CollaboratorID,
		Score:          score,
		Comment:        comment,
	})
}

// ChangeOrderStatus muda status do pedido com validação e auditoria
func (s *ServiceLayer) ChangeOrderStatus(ctx context.Context, orderID, userID, userRole string, req ChangeStatusRequest) error {
	// Verificar ownership/permissão
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	// Regras de permissão por role
	if userRole == "COLLABORATOR" && order.CollaboratorID != userID {
		return fmt.Errorf("não autorizado: pedido pertence a outro colaborador")
	}
	if userRole == "STUDENT" && order.StudentID != userID {
		return fmt.Errorf("não autorizado: pedido pertence a outro aluno")
	}

	// Se novo status é CONCLUIDO e payment_status é LOCKED, usar transação para liberar pagamento
	if req.NewStatus == OrderStatusConcluido && order.PaymentStatus == PaymentStatusLocked {
		return s.changeStatusWithPaymentRelease(ctx, order, orderID, userID, userRole, req)
	}

	// Atualizar status (com validação de transição)
	previousStatus, err := s.repo.UpdateOrderStatus(ctx, orderID, req.NewStatus)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Registrar histórico
	history := &OrderStatusHistory{
		ID:              uuid.New().String(),
		OrderID:         orderID,
		PreviousStatus:  &previousStatus,
		NewStatus:       req.NewStatus,
		ChangedByUserID: userID,
		ChangedByRole:   userRole,
		Comments:        req.Comments,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.CreateStatusHistory(ctx, history); err != nil {
		return fmt.Errorf("create history: %w", err)
	}

	// Publicar evento de mudança de status
	if s.dispatcher != nil {
		targetID := order.StudentID
		if userID == order.StudentID {
			targetID = order.CollaboratorID
		}
		event := events.Event{
			Type: events.EventOrderStatusChanged,
			Payload: map[string]interface{}{
				"order_id":   orderID,
				"user_id":    targetID,
				"new_status": string(req.NewStatus),
			},
			UserID:    userID,
			TargetIDs: []string{targetID},
		}
		s.dispatcher.PublishAsync(ctx, event)
	}

	return nil
}

// changeStatusWithPaymentRelease muda status para CONCLUIDO e libera pagamento atomicamente
func (s *ServiceLayer) changeStatusWithPaymentRelease(ctx context.Context, order *Order, orderID, userID, userRole string, req ChangeStatusRequest) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Validar transição de status via state machine
	if err := OrderStateMachine.ValidateTransition(order.Status, req.NewStatus); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	previousStatus := order.Status

	// Atualizar status dentro da transação
	err = s.repo.UpdateStatusTx(ctx, tx, orderID, req.NewStatus)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Liberar pagamento: payment_status -> RELEASED
	err = s.repo.UpdatePaymentStatusTx(ctx, tx, orderID, PaymentStatusReleased)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	// Mover saldo de locked para available
	err = s.financeRepo.ReleaseLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return fmt.Errorf("release locked balance: %w", err)
	}

	// Registrar histórico
	history := &OrderStatusHistory{
		ID:              uuid.New().String(),
		OrderID:         orderID,
		PreviousStatus:  &previousStatus,
		NewStatus:       req.NewStatus,
		ChangedByUserID: userID,
		ChangedByRole:   userRole,
		Comments:        req.Comments,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.CreateStatusHistory(ctx, history); err != nil {
		return fmt.Errorf("create history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	// Publicar eventos (após commit)
	if s.dispatcher != nil {
		targetID := order.StudentID
		if userID == order.StudentID {
			targetID = order.CollaboratorID
		}
		s.dispatcher.PublishAsync(ctx, events.Event{
			Type: events.EventOrderStatusChanged,
			Payload: map[string]interface{}{
				"order_id":   orderID,
				"user_id":    targetID,
				"new_status": string(req.NewStatus),
			},
			UserID:    userID,
			TargetIDs: []string{targetID},
		})
		s.dispatcher.PublishAsync(ctx, events.Event{
			Type: events.EventPaymentReleased,
			Payload: map[string]interface{}{
				"order_id":        orderID,
				"collaborator_id": order.CollaboratorID,
				"amount":          order.CollabValue,
			},
			UserID:    userID,
			TargetIDs: []string{order.CollaboratorID},
		})
	}

	return nil
}

// RequestInternalReview solicita revisão interna antes de enviar ao cliente
func (s *ServiceLayer) RequestInternalReview(ctx context.Context, orderID, collaboratorID string, notes *string) error {
	// Verificar ownership
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	if order.CollaboratorID != collaboratorID {
		return fmt.Errorf("não autorizado")
	}

	// Verificar se pode solicitar revisão
	if order.Status != OrderStatusEmAndamento {
		return fmt.Errorf("revisão interna só pode ser solicitada durante EM_ANDAMENTO")
	}

	// Atualizar
	previousStatus := order.Status
	if err := s.repo.RequestInternalReview(ctx, orderID, notes); err != nil {
		return fmt.Errorf("request internal review: %w", err)
	}

	// Registrar histórico
	history := &OrderStatusHistory{
		ID:              uuid.New().String(),
		OrderID:         orderID,
		PreviousStatus:  &previousStatus,
		NewStatus:       OrderStatusAguardandoRevisao,
		ChangedByUserID: collaboratorID,
		ChangedByRole:   "COLLABORATOR",
		Comments:        notes,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.CreateStatusHistory(ctx, history); err != nil {
		return fmt.Errorf("create history: %w", err)
	}

	// TODO: Notificar admin

	return nil
}

// GetOrderStatusHistory retorna histórico de mudanças
func (s *ServiceLayer) GetOrderStatusHistory(ctx context.Context, orderID, userID, userRole string) ([]OrderStatusHistory, error) {
	// Verificar permissão
	order, err := s.repo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}

	// COLLABORATOR e STUDENT só veem histórico de seus próprios pedidos
	if userRole == "COLLABORATOR" && order.CollaboratorID != userID {
		return nil, fmt.Errorf("não autorizado")
	}
	if userRole == "STUDENT" && order.StudentID != userID {
		return nil, fmt.Errorf("não autorizado")
	}

	return s.repo.GetOrderStatusHistory(ctx, orderID)
}
