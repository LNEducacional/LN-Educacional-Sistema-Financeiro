package disputes

import (
	"context"
	"fmt"
	"log"

	"financial-system/internal/modules/finance"
	"financial-system/internal/modules/orders"
	"financial-system/internal/platform/events"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DisputePaymentHandler processa eventos de resolucao de disputas
// e executa as acoes financeiras correspondentes
type DisputePaymentHandler struct {
	db          *pgxpool.Pool
	disputeRepo *Repository
	orderRepo   *orders.Repository
	financeRepo *finance.Repository
}

// NewDisputePaymentHandler cria nova instancia do handler
func NewDisputePaymentHandler(
	db *pgxpool.Pool,
	disputeRepo *Repository,
	orderRepo *orders.Repository,
	financeRepo *finance.Repository,
) *DisputePaymentHandler {
	return &DisputePaymentHandler{
		db:          db,
		disputeRepo: disputeRepo,
		orderRepo:   orderRepo,
		financeRepo: financeRepo,
	}
}

// Handle implementa events.EventHandler
func (h *DisputePaymentHandler) Handle(ctx context.Context, event events.Event) error {
	if event.Type != events.EventDisputeResolved {
		return nil
	}

	disputeID, ok := event.Payload["dispute_id"].(string)
	if !ok {
		return fmt.Errorf("dispute_id not found in event payload")
	}

	orderID, ok := event.Payload["order_id"].(string)
	if !ok {
		return fmt.Errorf("order_id not found in event payload")
	}

	resolution, ok := event.Payload["resolution"].(DisputeResolution)
	if !ok {
		// Try string conversion
		resStr, ok := event.Payload["resolution"].(string)
		if !ok {
			return fmt.Errorf("resolution not found in event payload")
		}
		resolution = DisputeResolution(resStr)
	}

	log.Printf("[DisputePaymentHandler] Processing resolution %s for dispute %s, order %s",
		resolution, disputeID, orderID)

	switch resolution {
	case DisputeResolutionFavorAluno:
		return h.handleFavorAluno(ctx, orderID)
	case DisputeResolutionFavorColaborador:
		return h.handleFavorColaborador(ctx, orderID)
	case DisputeResolutionAcordo:
		return h.handleAcordo(ctx, orderID)
	case DisputeResolutionParcial:
		return h.handleParcial(ctx, orderID)
	default:
		log.Printf("[DisputePaymentHandler] Unknown resolution type: %s", resolution)
		return nil
	}
}

// handleFavorAluno processa resolucao a favor do aluno (reembolso)
// Remove o valor bloqueado da carteira do colaborador e marca como REFUNDED
func (h *DisputePaymentHandler) handleFavorAluno(ctx context.Context, orderID string) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Buscar pedido com lock
	order, err := h.orderRepo.GetByIDTx(ctx, tx, orderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	// Verificar se o pagamento ainda esta bloqueado
	if order.PaymentStatus != orders.PaymentStatusLocked {
		log.Printf("[DisputePaymentHandler] Order %s payment already processed (status: %s)",
			orderID, order.PaymentStatus)
		return nil
	}

	// Remover valor bloqueado da carteira do colaborador
	err = h.financeRepo.DebitLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return fmt.Errorf("debit locked balance: %w", err)
	}

	// Atualizar payment_status para REFUNDED
	err = h.orderRepo.UpdatePaymentStatusTx(ctx, tx, orderID, orders.PaymentStatusRefunded)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	// Registrar transacao de cancelamento (ledger entry)
	wallet, err := h.financeRepo.GetWalletByUserIDTx(ctx, tx, order.CollaboratorID)
	if err != nil {
		return fmt.Errorf("get wallet: %w", err)
	}

	description := "Reembolso - Disputa resolvida a favor do aluno"
	_, err = h.financeRepo.CreateTransaction(ctx, tx, finance.CreateTransactionInput{
		WalletID:    wallet.ID,
		OrderID:     &orderID,
		Amount:      order.CollabValue,
		Type:        finance.TxTypeDebit,
		Status:      finance.TxStatusCanceled,
		Description: &description,
	})
	if err != nil {
		return fmt.Errorf("create refund transaction: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	log.Printf("[DisputePaymentHandler] FAVOR_ALUNO: Refunded R$ %.2f from collaborator %s for order %s",
		order.CollabValue, order.CollaboratorID, orderID)

	return nil
}

// handleFavorColaborador processa resolucao a favor do colaborador (liberar pagamento)
// Move o valor bloqueado para disponivel na carteira do colaborador
func (h *DisputePaymentHandler) handleFavorColaborador(ctx context.Context, orderID string) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Buscar pedido com lock
	order, err := h.orderRepo.GetByIDTx(ctx, tx, orderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	// Verificar se o pagamento ainda esta bloqueado
	if order.PaymentStatus != orders.PaymentStatusLocked {
		log.Printf("[DisputePaymentHandler] Order %s payment already processed (status: %s)",
			orderID, order.PaymentStatus)
		return nil
	}

	// Liberar valor bloqueado para disponivel
	err = h.financeRepo.ReleaseLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return fmt.Errorf("release locked balance: %w", err)
	}

	// Atualizar payment_status para RELEASED
	err = h.orderRepo.UpdatePaymentStatusTx(ctx, tx, orderID, orders.PaymentStatusReleased)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	// Atualizar status do pedido para CONCLUIDO (se ainda nao estiver)
	if order.Status != orders.OrderStatusConcluido {
		err = h.orderRepo.UpdateStatusTx(ctx, tx, orderID, orders.OrderStatusConcluido)
		if err != nil {
			return fmt.Errorf("update order status: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	log.Printf("[DisputePaymentHandler] FAVOR_COLABORADOR: Released R$ %.2f to collaborator %s for order %s",
		order.CollabValue, order.CollaboratorID, orderID)

	return nil
}

// handleAcordo processa resolucao por acordo (split 50/50)
// Libera metade do valor para o colaborador e cancela a outra metade
func (h *DisputePaymentHandler) handleAcordo(ctx context.Context, orderID string) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Buscar pedido com lock
	order, err := h.orderRepo.GetByIDTx(ctx, tx, orderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	// Verificar se o pagamento ainda esta bloqueado
	if order.PaymentStatus != orders.PaymentStatusLocked {
		log.Printf("[DisputePaymentHandler] Order %s payment already processed (status: %s)",
			orderID, order.PaymentStatus)
		return nil
	}

	// Split 50/50
	collabShare := order.CollabValue / 2
	refundShare := order.CollabValue - collabShare // Garante precisao

	// Buscar carteira do colaborador
	wallet, err := h.financeRepo.GetWalletByUserIDTx(ctx, tx, order.CollaboratorID)
	if err != nil {
		return fmt.Errorf("get wallet: %w", err)
	}

	// Remover valor total bloqueado
	err = h.financeRepo.DebitLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return fmt.Errorf("debit locked balance: %w", err)
	}

	// Creditar metade como disponivel (via query direta para evitar problema de saldo)
	creditQuery := `
		UPDATE wallets
		SET balance_available = balance_available + $1, updated_at = NOW()
		WHERE user_id = $2
	`
	_, err = tx.Exec(ctx, creditQuery, collabShare, order.CollaboratorID)
	if err != nil {
		return fmt.Errorf("credit available balance: %w", err)
	}

	// Registrar transacao de liberacao parcial
	descRelease := fmt.Sprintf("Acordo - Liberacao parcial (50%%) da disputa")
	_, err = h.financeRepo.CreateTransaction(ctx, tx, finance.CreateTransactionInput{
		WalletID:    wallet.ID,
		OrderID:     &orderID,
		Amount:      collabShare,
		Type:        finance.TxTypeCredit,
		Status:      finance.TxStatusReleased,
		Description: &descRelease,
	})
	if err != nil {
		return fmt.Errorf("create release transaction: %w", err)
	}

	// Registrar transacao de reembolso parcial
	descRefund := fmt.Sprintf("Acordo - Reembolso parcial (50%%) da disputa")
	_, err = h.financeRepo.CreateTransaction(ctx, tx, finance.CreateTransactionInput{
		WalletID:    wallet.ID,
		OrderID:     &orderID,
		Amount:      refundShare,
		Type:        finance.TxTypeDebit,
		Status:      finance.TxStatusCanceled,
		Description: &descRefund,
	})
	if err != nil {
		return fmt.Errorf("create refund transaction: %w", err)
	}

	// Atualizar payment_status para RELEASED (colaborador recebeu sua parte)
	err = h.orderRepo.UpdatePaymentStatusTx(ctx, tx, orderID, orders.PaymentStatusReleased)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	log.Printf("[DisputePaymentHandler] ACORDO: Split for order %s - Collaborator: R$ %.2f, Refunded: R$ %.2f",
		orderID, collabShare, refundShare)

	return nil
}

// handleParcial processa resolucao parcial (mesmo que acordo por enquanto)
// Futuramente pode aceitar percentual customizado
func (h *DisputePaymentHandler) handleParcial(ctx context.Context, orderID string) error {
	// Por enquanto, usa a mesma logica de acordo (50/50)
	// TODO: Adicionar campo de percentual customizado na resolucao
	return h.handleAcordo(ctx, orderID)
}
