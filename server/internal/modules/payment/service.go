package payment

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financial-system/internal/config"
	"financial-system/internal/modules/finance"
	asaaspkg "financial-system/internal/platform/payment"
)

// OrderForRefund representa os dados do pedido necessarios para processar reembolso
type OrderForRefund struct {
	ID             string
	CollaboratorID string
	CollabValue    float64
	PaymentStatus  string
}

// OrderRepositoryForRefund interface para operacoes de pedido necessarias no reembolso
// Evita dependencia circular com o modulo orders
type OrderRepositoryForRefund interface {
	GetByIDForRefund(ctx context.Context, tx pgx.Tx, id string) (*OrderForRefund, error)
	UpdatePaymentStatusForRefund(ctx context.Context, tx pgx.Tx, id string, status string) error
}

// Service interface para operações de pagamento
type Service interface {
	// Charges
	CreateChargeForOrder(ctx context.Context, orderID string, value float64, billingType BillingType, dueDate time.Time, studentEmail, studentName string) (*ChargeResponse, error)
	GetChargeByOrderID(ctx context.Context, orderID string) (*ChargeResponse, error)
	RefreshPixQRCode(ctx context.Context, orderID string) (*ChargeResponse, error)

	// Payouts
	RequestPayout(ctx context.Context, collaboratorID string, req CreatePayoutRequest) (*PayoutResponse, error)
	GetPayoutByID(ctx context.Context, id string) (*PayoutResponse, error)
	GetPayoutsByCollaboratorID(ctx context.Context, collaboratorID string, page, limit int) (*PayoutListResponse, error)
	ProcessPendingPayouts(ctx context.Context) (int, error)
	ListAllPayouts(ctx context.Context, status string, page, limit int) (*AdminPayoutListResponse, error)
	ApprovePayout(ctx context.Context, id, adminID string) error
	RejectPayout(ctx context.Context, id, adminID, reason string) error

	// Student Charges
	GetChargesByStudentID(ctx context.Context, studentID string, page, limit int) (*StudentChargeListResponse, error)

	// Webhooks
	HandlePaymentWebhook(ctx context.Context, eventID, eventType string, payload *asaaspkg.PaymentWebhookPayload) error
	HandleTransferWebhook(ctx context.Context, eventID, eventType string, payload *asaaspkg.TransferWebhookPayload) error
	IsWebhookProcessed(ctx context.Context, eventID string) (bool, error)
	LogWebhook(ctx context.Context, eventID, eventType, rawPayload string) error

	// Balance
	GetCollaboratorBalance(ctx context.Context, collaboratorID string) (*BalanceResponse, error)

	// Withdrawal Limits
	GetWithdrawalLimitsForUser(ctx context.Context, collaboratorID string) (*UserWithdrawalLimitsResponse, error)

	// Authorization
	ValidateChargeAccess(ctx context.Context, orderID, userID, userRole string) error

	// Check if configured
	IsConfigured() bool
}

type service struct {
	db          *pgxpool.Pool
	repo        Repository
	asaas       asaaspkg.AsaasClient
	financeRepo *finance.Repository
	orderRepo   OrderRepositoryForRefund
	cfg         *config.Config
}

// NewService cria um novo serviço de payment
func NewService(repo Repository, asaas asaaspkg.AsaasClient, financeRepo *finance.Repository, cfg *config.Config) Service {
	return &service{
		repo:        repo,
		asaas:       asaas,
		financeRepo: financeRepo,
		cfg:         cfg,
	}
}

// NewServiceWithDB cria um novo serviço de payment com acesso ao banco e orders repository
func NewServiceWithDB(db *pgxpool.Pool, repo Repository, asaas asaaspkg.AsaasClient, financeRepo *finance.Repository, orderRepo OrderRepositoryForRefund, cfg *config.Config) Service {
	return &service{
		db:          db,
		repo:        repo,
		asaas:       asaas,
		financeRepo: financeRepo,
		orderRepo:   orderRepo,
		cfg:         cfg,
	}
}

// IsConfigured verifica se o cliente ASAAS está configurado
func (s *service) IsConfigured() bool {
	return s.asaas.IsConfigured()
}

// ValidateChargeAccess verifica se o usuario tem permissao para acessar dados de cobranca de um pedido
func (s *service) ValidateChargeAccess(ctx context.Context, orderID, userID, userRole string) error {
	if userRole == "ADMIN" || userRole == "FINANCEIRO" {
		return nil
	}

	studentID, collaboratorID, err := s.repo.GetOrderOwnership(ctx, orderID)
	if err != nil {
		return fmt.Errorf("validar acesso: %w", err)
	}

	if userID == studentID || userID == collaboratorID {
		return nil
	}

	return fmt.Errorf("acesso negado")
}

// getWithdrawalLimits le limites de saque do system_settings (fallback para config)
func (s *service) getWithdrawalLimits(ctx context.Context) (minAmount, maxAmount, dailyLimit float64) {
	minAmount = s.cfg.WithdrawalMinAmount
	maxAmount = s.cfg.WithdrawalMaxAmount
	dailyLimit = s.cfg.WithdrawalDailyLimit

	if s.db == nil {
		return
	}

	rows, err := s.db.Query(ctx,
		`SELECT key, value FROM system_settings WHERE key IN ($1, $2, $3)`,
		"withdrawal_min_amount", "withdrawal_max_amount", "withdrawal_daily_limit",
	)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil || parsed <= 0 {
			continue
		}
		switch key {
		case "withdrawal_min_amount":
			minAmount = parsed
		case "withdrawal_max_amount":
			maxAmount = parsed
		case "withdrawal_daily_limit":
			dailyLimit = parsed
		}
	}

	return
}

// GetWithdrawalLimitsForUser retorna limites de saque + uso diario do colaborador
func (s *service) GetWithdrawalLimitsForUser(ctx context.Context, collaboratorID string) (*UserWithdrawalLimitsResponse, error) {
	minAmount, maxAmount, dailyLimit := s.getWithdrawalLimits(ctx)

	dailyUsed, err := s.repo.GetDailyPayoutTotal(ctx, collaboratorID)
	if err != nil {
		return nil, fmt.Errorf("get daily payout total: %w", err)
	}

	return &UserWithdrawalLimitsResponse{
		MinAmount:  minAmount,
		MaxAmount:  maxAmount,
		DailyLimit: dailyLimit,
		DailyUsed:  dailyUsed,
	}, nil
}

// ----- Charges -----

func (s *service) CreateChargeForOrder(ctx context.Context, orderID string, value float64, billingType BillingType, dueDate time.Time, studentEmail, studentName string) (*ChargeResponse, error) {
	if !s.asaas.IsConfigured() {
		return nil, fmt.Errorf("payment gateway not configured")
	}

	// Criar ou buscar cliente ASAAS
	customerID, err := s.getOrCreateAsaasCustomer(ctx, studentEmail, studentName)
	if err != nil {
		return nil, fmt.Errorf("get or create customer: %w", err)
	}

	// Criar cobrança no ASAAS
	paymentReq := asaaspkg.CreatePaymentRequest{
		Customer:          customerID,
		BillingType:       asaaspkg.BillingType(billingType),
		Value:             value,
		DueDate:           dueDate.Format("2006-01-02"),
		ExternalReference: orderID,
		Description:       fmt.Sprintf("Pedido #%s", orderID[:8]),
	}

	paymentResp, err := s.asaas.CreatePayment(ctx, paymentReq)
	if err != nil {
		return nil, fmt.Errorf("create asaas payment: %w", err)
	}

	// Buscar QR Code PIX se for pagamento PIX
	var pixQR, pixPayload *string
	var pixExpiration *time.Time
	if billingType == BillingTypePIX {
		qrResp, err := s.asaas.GetPixQRCode(ctx, paymentResp.ID)
		if err == nil {
			pixQR = &qrResp.EncodedImage
			pixPayload = &qrResp.Payload
			pixExpiration = &qrResp.ExpirationDate
		}
	}

	// Criar registro local
	charge := &Charge{
		ID:              uuid.New().String(),
		OrderID:         orderID,
		AsaasChargeID:   &paymentResp.ID,
		AsaasCustomerID: &customerID,
		Status:          ChargeStatusPending,
		BillingType:     billingType,
		Value:           value,
		InvoiceURL:      &paymentResp.InvoiceURL,
		BankSlipURL:     strPtr(paymentResp.BankSlipURL),
		PixQRCode:       pixQR,
		PixPayload:      pixPayload,
		PixExpiration:   pixExpiration,
		DueDate:         dueDate,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.repo.CreateCharge(ctx, charge); err != nil {
		return nil, fmt.Errorf("create charge record: %w", err)
	}

	return s.chargeToResponse(charge), nil
}

func (s *service) getOrCreateAsaasCustomer(ctx context.Context, email, name string) (string, error) {
	// Buscar cliente existente pelo email no ASAAS
	customer, err := s.asaas.FindCustomerByEmail(ctx, email)
	if err != nil {
		return "", fmt.Errorf("find customer: %w", err)
	}

	if customer != nil {
		return customer.ID, nil
	}

	// Criar novo cliente
	newCustomer, err := s.asaas.CreateCustomer(ctx, asaaspkg.CreateCustomerRequest{
		Name:  name,
		Email: email,
	})
	if err != nil {
		return "", fmt.Errorf("create customer: %w", err)
	}

	return newCustomer.ID, nil
}

func (s *service) GetChargeByOrderID(ctx context.Context, orderID string) (*ChargeResponse, error) {
	charge, err := s.repo.GetChargeByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if charge == nil {
		return nil, nil
	}
	return s.chargeToResponse(charge), nil
}

func (s *service) RefreshPixQRCode(ctx context.Context, orderID string) (*ChargeResponse, error) {
	charge, err := s.repo.GetChargeByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if charge == nil {
		return nil, fmt.Errorf("charge not found")
	}
	if charge.AsaasChargeID == nil {
		return nil, fmt.Errorf("charge has no ASAAS ID")
	}

	// Buscar novo QR Code
	qrResp, err := s.asaas.GetPixQRCode(ctx, *charge.AsaasChargeID)
	if err != nil {
		return nil, fmt.Errorf("get pix qr code: %w", err)
	}

	// Atualizar registro
	if err := s.repo.UpdateChargeAsaasData(ctx, charge.ID, nil, nil, &qrResp.EncodedImage, &qrResp.Payload, nil); err != nil {
		return nil, fmt.Errorf("update charge: %w", err)
	}

	charge.PixQRCode = &qrResp.EncodedImage
	charge.PixPayload = &qrResp.Payload
	charge.PixExpiration = &qrResp.ExpirationDate

	return s.chargeToResponse(charge), nil
}

// ----- Payouts -----

func (s *service) RequestPayout(ctx context.Context, collaboratorID string, req CreatePayoutRequest) (*PayoutResponse, error) {
	// Buscar limites dinamicos (settings DB com fallback para config)
	minAmount, maxAmount, dailyLimit := s.getWithdrawalLimits(ctx)

	// Validar limites
	if req.Amount < minAmount {
		return nil, fmt.Errorf("valor mínimo para saque é R$ %.2f", minAmount)
	}
	if req.Amount > maxAmount {
		return nil, fmt.Errorf("valor máximo para saque é R$ %.2f", maxAmount)
	}

	// Verificar limite diário
	dailyTotal, err := s.repo.GetDailyPayoutTotal(ctx, collaboratorID)
	if err != nil {
		return nil, fmt.Errorf("get daily total: %w", err)
	}
	if dailyTotal+req.Amount > dailyLimit {
		return nil, fmt.Errorf("limite diário de R$ %.2f excedido", dailyLimit)
	}

	// Buscar wallet do colaborador
	wallet, err := s.financeRepo.GetWalletByUserID(ctx, collaboratorID)
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found")
	}

	// Verificar saldo disponível
	if wallet.BalanceAvailable < req.Amount {
		return nil, fmt.Errorf("saldo insuficiente: disponível R$ %.2f", wallet.BalanceAvailable)
	}

	// Debitar saldo (transação)
	if err := s.financeRepo.DebitBalance(ctx, wallet.ID, req.Amount); err != nil {
		return nil, fmt.Errorf("debit balance: %w", err)
	}

	// Criar registro de payout
	payout := &Payout{
		ID:             uuid.New().String(),
		CollaboratorID: collaboratorID,
		WalletID:       wallet.ID,
		Status:         PayoutStatusPending,
		Value:          req.Amount,
		PixKey:         req.PixKey,
		PixKeyType:     req.PixKeyType,
		RetryCount:     0,
		MaxRetries:     3,
		RequestedAt:    time.Now(),
	}

	if err := s.repo.CreatePayout(ctx, payout); err != nil {
		// Reverter débito em caso de erro
		_ = s.financeRepo.CreditBalance(ctx, wallet.ID, req.Amount)
		return nil, fmt.Errorf("create payout: %w", err)
	}

	return s.payoutToResponse(payout), nil
}

func (s *service) GetPayoutByID(ctx context.Context, id string) (*PayoutResponse, error) {
	payout, err := s.repo.GetPayoutByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if payout == nil {
		return nil, nil
	}
	return s.payoutToResponse(payout), nil
}

func (s *service) GetPayoutsByCollaboratorID(ctx context.Context, collaboratorID string, page, limit int) (*PayoutListResponse, error) {
	offset := (page - 1) * limit
	payouts, total, err := s.repo.GetPayoutsByCollaboratorID(ctx, collaboratorID, limit, offset)
	if err != nil {
		return nil, err
	}

	var responses []PayoutResponse
	for _, p := range payouts {
		responses = append(responses, *s.payoutToResponse(&p))
	}

	return &PayoutListResponse{
		Payouts:    responses,
		TotalCount: total,
		Page:       page,
		Limit:      limit,
	}, nil
}

func (s *service) ProcessPendingPayouts(ctx context.Context) (int, error) {
	if !s.asaas.IsConfigured() {
		return 0, nil
	}

	// Process only APPROVED payouts (requires admin approval first)
	payouts, err := s.repo.GetApprovedPayouts(ctx, 50)
	if err != nil {
		return 0, fmt.Errorf("get approved payouts: %w", err)
	}

	processed := 0
	for _, payout := range payouts {
		if err := s.processSinglePayout(ctx, &payout); err != nil {
			log.Printf("Error processing payout %s: %v", payout.ID, err)
			continue
		}
		processed++
	}

	return processed, nil
}

func (s *service) ListAllPayouts(ctx context.Context, status string, page, limit int) (*AdminPayoutListResponse, error) {
	offset := (page - 1) * limit

	total, err := s.repo.CountAllPayouts(ctx, status)
	if err != nil {
		return nil, fmt.Errorf("count payouts: %w", err)
	}

	items, err := s.repo.ListAllPayouts(ctx, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list payouts: %w", err)
	}

	totalPages := total / limit
	if total%limit > 0 {
		totalPages++
	}

	return &AdminPayoutListResponse{
		Withdrawals: items,
		Total:       total,
		Page:        page,
		PageSize:    limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *service) ApprovePayout(ctx context.Context, id, adminID string) error {
	payout, err := s.repo.GetPayoutByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get payout: %w", err)
	}
	if payout == nil {
		return fmt.Errorf("payout not found")
	}
	if payout.Status != PayoutStatusPending {
		return fmt.Errorf("payout is not in PENDING status (current: %s)", payout.Status)
	}

	if err := s.repo.ApprovePayout(ctx, id, adminID); err != nil {
		return fmt.Errorf("approve payout: %w", err)
	}

	return nil
}

func (s *service) RejectPayout(ctx context.Context, id, adminID, reason string) error {
	payout, err := s.repo.GetPayoutByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get payout: %w", err)
	}
	if payout == nil {
		return fmt.Errorf("payout not found")
	}
	if payout.Status != PayoutStatusPending {
		return fmt.Errorf("payout is not in PENDING status (current: %s)", payout.Status)
	}

	// Refund balance back to collaborator wallet
	if err := s.financeRepo.CreditBalance(ctx, payout.WalletID, payout.Value); err != nil {
		return fmt.Errorf("refund balance: %w", err)
	}

	if err := s.repo.RejectPayout(ctx, id, adminID, reason); err != nil {
		// Attempt to rollback the credit
		_ = s.financeRepo.DebitBalance(ctx, payout.WalletID, payout.Value)
		return fmt.Errorf("reject payout: %w", err)
	}

	log.Printf("[Withdrawal] REJECTED payout %s (R$ %.2f) for collaborator %s - reason: %s",
		id, payout.Value, payout.CollaboratorID, reason)

	return nil
}

func (s *service) processSinglePayout(ctx context.Context, payout *Payout) error {
	// Incrementar contador de tentativas
	if err := s.repo.IncrementPayoutRetry(ctx, payout.ID); err != nil {
		return fmt.Errorf("increment retry: %w", err)
	}

	// Criar transferência no ASAAS
	transferReq := asaaspkg.CreateTransferRequest{
		Value:           payout.Value,
		PixAddressKey:   payout.PixKey,
		PixAddressKeyType: asaaspkg.PixKeyType(payout.PixKeyType),
		Description:     fmt.Sprintf("Saque #%s", payout.ID[:8]),
	}

	transfer, err := s.asaas.CreateTransfer(ctx, transferReq)
	if err != nil {
		errMsg := err.Error()
		if err := s.repo.UpdatePayoutStatus(ctx, payout.ID, PayoutStatusFailed, nil, &errMsg); err != nil {
			log.Printf("Error updating payout status: %v", err)
		}
		return fmt.Errorf("create transfer: %w", err)
	}

	// Atualizar status para PROCESSING
	if err := s.repo.UpdatePayoutStatus(ctx, payout.ID, PayoutStatusProcessing, &transfer.ID, nil); err != nil {
		return fmt.Errorf("update payout status: %w", err)
	}

	return nil
}

// ----- Student Charges -----

func (s *service) GetChargesByStudentID(ctx context.Context, studentID string, page, limit int) (*StudentChargeListResponse, error) {
	offset := (page - 1) * limit

	total, err := s.repo.CountChargesByStudentID(ctx, studentID)
	if err != nil {
		return nil, fmt.Errorf("count charges: %w", err)
	}

	charges, err := s.repo.GetChargesByStudentID(ctx, studentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("get charges: %w", err)
	}

	totalPages := total / limit
	if total%limit > 0 {
		totalPages++
	}

	return &StudentChargeListResponse{
		Charges:    charges,
		Total:      total,
		Page:       page,
		PageSize:   limit,
		TotalPages: totalPages,
	}, nil
}

// ----- Webhooks -----

func (s *service) IsWebhookProcessed(ctx context.Context, eventID string) (bool, error) {
	return s.repo.IsWebhookProcessed(ctx, eventID)
}

func (s *service) LogWebhook(ctx context.Context, eventID, eventType, rawPayload string) error {
	return s.repo.CreateWebhookLog(ctx, eventID, eventType, rawPayload)
}

func (s *service) HandlePaymentWebhook(ctx context.Context, eventID, eventType string, payload *asaaspkg.PaymentWebhookPayload) error {
	charge, err := s.repo.GetChargeByAsaasID(ctx, payload.ID)
	if err != nil {
		return fmt.Errorf("get charge: %w", err)
	}
	if charge == nil {
		log.Printf("Charge not found for ASAAS ID: %s", payload.ID)
		return nil
	}

	var newStatus ChargeStatus
	var paidAt *time.Time

	switch eventType {
	case "PAYMENT_CONFIRMED":
		newStatus = ChargeStatusConfirmed
	case "PAYMENT_RECEIVED":
		newStatus = ChargeStatusReceived
		now := time.Now()
		paidAt = &now
		// NOTA: NAO liberamos o saldo automaticamente aqui.
		// O modelo de escrow requer que o ALUNO aprove a entrega antes de liberar.
		// O fluxo e: Aluno paga -> Colaborador trabalha -> Aluno aprova -> Saldo liberado
		log.Printf("[Webhook] Payment received for order %s - awaiting student approval to release", charge.OrderID)
	case "PAYMENT_OVERDUE":
		newStatus = ChargeStatusOverdue
	case "PAYMENT_REFUNDED":
		newStatus = ChargeStatusRefunded
		// Processar reembolso: reverter saldo bloqueado do colaborador
		if err := s.processPaymentRefund(ctx, charge); err != nil {
			log.Printf("[Webhook] Error processing refund for order %s: %v", charge.OrderID, err)
			// Nao retornamos erro para nao bloquear o webhook
		}
	default:
		return nil
	}

	if err := s.repo.UpdateChargeStatus(ctx, charge.ID, newStatus, paidAt); err != nil {
		return fmt.Errorf("update charge status: %w", err)
	}

	// Marcar webhook como processado
	if err := s.repo.MarkWebhookProcessed(ctx, eventID, nil); err != nil {
		log.Printf("Error marking webhook processed: %v", err)
	}

	return nil
}

// PaymentStatusLocked representa o status de pagamento bloqueado (escrow)
const PaymentStatusLocked = "LOCKED"

// PaymentStatusRefunded representa o status de pagamento reembolsado
const PaymentStatusRefunded = "REFUNDED"

// processPaymentRefund processa um reembolso do ASAAS (chargeback, estorno, etc)
// Remove o valor bloqueado da carteira do colaborador e marca o pedido como REFUNDED
func (s *service) processPaymentRefund(ctx context.Context, charge *Charge) error {
	// Verificar se temos acesso ao banco e order repo
	if s.db == nil || s.orderRepo == nil {
		log.Printf("[Webhook] Cannot process refund - missing db or orderRepo dependency")
		return nil
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Buscar pedido
	order, err := s.orderRepo.GetByIDForRefund(ctx, tx, charge.OrderID)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	// Verificar se o pagamento ainda esta bloqueado
	if order.PaymentStatus != PaymentStatusLocked {
		log.Printf("[Webhook] Order %s payment already processed (status: %s), skipping refund",
			charge.OrderID, order.PaymentStatus)
		return nil
	}

	// Remover valor bloqueado da carteira do colaborador
	err = s.financeRepo.DebitLocked(ctx, tx, order.CollaboratorID, order.CollabValue)
	if err != nil {
		return fmt.Errorf("debit locked balance: %w", err)
	}

	// Atualizar payment_status para REFUNDED
	err = s.orderRepo.UpdatePaymentStatusForRefund(ctx, tx, charge.OrderID, PaymentStatusRefunded)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}

	// Registrar transacao de cancelamento (ledger entry)
	wallet, err := s.financeRepo.GetWalletByUserIDTx(ctx, tx, order.CollaboratorID)
	if err != nil {
		return fmt.Errorf("get wallet: %w", err)
	}

	description := "Estorno ASAAS - Pagamento reembolsado pelo gateway"
	_, err = s.financeRepo.CreateTransaction(ctx, tx, finance.CreateTransactionInput{
		WalletID:    wallet.ID,
		OrderID:     &charge.OrderID,
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

	log.Printf("[Webhook] PAYMENT_REFUNDED: Reversed R$ %.2f from collaborator %s for order %s",
		order.CollabValue, order.CollaboratorID, charge.OrderID)

	return nil
}

func (s *service) HandleTransferWebhook(ctx context.Context, eventID, eventType string, payload *asaaspkg.TransferWebhookPayload) error {
	payout, err := s.repo.GetPayoutByAsaasID(ctx, payload.ID)
	if err != nil {
		return fmt.Errorf("get payout: %w", err)
	}
	if payout == nil {
		log.Printf("Payout not found for ASAAS transfer ID: %s", payload.ID)
		return nil
	}

	switch eventType {
	case "TRANSFER_DONE":
		if err := s.repo.UpdatePayoutCompleted(ctx, payout.ID, payload.NetValue, payload.TransferFee); err != nil {
			return fmt.Errorf("update payout completed: %w", err)
		}
	case "TRANSFER_FAILED", "TRANSFER_CANCELLED":
		errMsg := payload.FailReason
		if errMsg == "" {
			errMsg = "Transfer cancelled"
		}
		if err := s.repo.UpdatePayoutStatus(ctx, payout.ID, PayoutStatusFailed, nil, &errMsg); err != nil {
			return fmt.Errorf("update payout failed: %w", err)
		}
		// Devolver saldo ao colaborador
		if err := s.financeRepo.CreditBalance(ctx, payout.WalletID, payout.Value); err != nil {
			log.Printf("Error returning balance for payout %s: %v", payout.ID, err)
		}
	}

	// Marcar webhook como processado
	if err := s.repo.MarkWebhookProcessed(ctx, eventID, nil); err != nil {
		log.Printf("Error marking webhook processed: %v", err)
	}

	return nil
}

// ----- Balance -----

func (s *service) GetCollaboratorBalance(ctx context.Context, collaboratorID string) (*BalanceResponse, error) {
	wallet, err := s.financeRepo.GetWalletByUserID(ctx, collaboratorID)
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	if wallet == nil {
		return nil, fmt.Errorf("wallet not found")
	}

	return &BalanceResponse{
		AvailableBalance: wallet.BalanceAvailable,
		LockedBalance:    wallet.BalanceLocked,
		TotalBalance:     wallet.BalanceAvailable + wallet.BalanceLocked,
	}, nil
}

// ----- Helpers -----

func (s *service) chargeToResponse(c *Charge) *ChargeResponse {
	resp := &ChargeResponse{
		ID:          c.ID,
		OrderID:     c.OrderID,
		Status:      c.Status,
		BillingType: c.BillingType,
		Value:       c.Value,
		DueDate:     c.DueDate,
		PaidAt:      c.PaidAt,
		CreatedAt:   c.CreatedAt,
	}

	if c.InvoiceURL != nil {
		resp.InvoiceURL = *c.InvoiceURL
	}
	if c.PixQRCode != nil {
		resp.PixQRCode = *c.PixQRCode
	}
	if c.PixPayload != nil {
		resp.PixPayload = *c.PixPayload
	}
	if c.BankSlipURL != nil {
		resp.BankSlipURL = *c.BankSlipURL
	}

	return resp
}

func (s *service) payoutToResponse(p *Payout) *PayoutResponse {
	resp := &PayoutResponse{
		ID:             p.ID,
		CollaboratorID: p.CollaboratorID,
		Status:         p.Status,
		Value:          p.Value,
		Fee:            p.Fee,
		PixKey:         p.PixKey,
		PixKeyType:     p.PixKeyType,
		RequestedAt:    p.RequestedAt,
		CompletedAt:    p.CompletedAt,
	}

	if p.NetValue != nil {
		resp.NetValue = *p.NetValue
	}
	if p.ErrorMessage != nil {
		resp.ErrorMessage = *p.ErrorMessage
	}

	return resp
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
