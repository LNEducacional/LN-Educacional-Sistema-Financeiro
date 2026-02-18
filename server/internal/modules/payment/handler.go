package payment

import (
	"encoding/json"
	"net/http"
	"strconv"

	"financial-system/internal/platform/middleware"

	"github.com/go-chi/chi/v5"
)

// Handler para endpoints de pagamento
type Handler struct {
	service Service
}

// NewHandler cria um novo handler de payment
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registra as rotas de payment (autenticadas)
func (h *Handler) RegisterRoutes(r chi.Router) {
	// Charges
	r.Get("/charges/{orderID}", h.GetChargeByOrderID)
	r.Get("/charges/{orderID}/refresh-pix", h.RefreshPixQRCode)
	r.Get("/my-charges", h.ListMyCharges)

	// Payouts (Collaborator)
	r.Post("/withdrawals", h.RequestWithdrawal)
	r.Get("/withdrawals", h.ListMyWithdrawals)
	r.Get("/withdrawals/limits", h.GetWithdrawalLimits)
	r.Get("/withdrawals/{id}", h.GetWithdrawal)

	// Balance
	r.Get("/balance", h.GetBalance)
}

// RegisterAdminRoutes registra as rotas de admin
func (h *Handler) RegisterAdminRoutes(r chi.Router) {
	r.Get("/", h.ListAllWithdrawals)
	r.Put("/{id}/approve", h.ApproveWithdrawal)
	r.Put("/{id}/reject", h.RejectWithdrawal)
}

// ----- Charges -----

// GetChargeByOrderID busca detalhes da cobrança de um pedido
func (h *Handler) GetChargeByOrderID(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userRole, _ := r.Context().Value(middleware.UserRoleKey).(string)

	orderID := chi.URLParam(r, "orderID")
	if orderID == "" {
		http.Error(w, "orderID is required", http.StatusBadRequest)
		return
	}

	if err := h.service.ValidateChargeAccess(r.Context(), orderID, userID, userRole); err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	charge, err := h.service.GetChargeByOrderID(r.Context(), orderID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if charge == nil {
		http.Error(w, "charge not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, charge)
}

// RefreshPixQRCode gera um novo QR Code PIX
func (h *Handler) RefreshPixQRCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userRole, _ := r.Context().Value(middleware.UserRoleKey).(string)

	orderID := chi.URLParam(r, "orderID")
	if orderID == "" {
		http.Error(w, "orderID is required", http.StatusBadRequest)
		return
	}

	if err := h.service.ValidateChargeAccess(r.Context(), orderID, userID, userRole); err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	charge, err := h.service.RefreshPixQRCode(r.Context(), orderID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, charge)
}

// ListMyCharges lista as cobrancas do aluno logado
func (h *Handler) ListMyCharges(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	result, err := h.service.GetChargesByStudentID(r.Context(), userID, page, pageSize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// ----- Payouts -----

// RequestWithdrawal solicita um saque
func (h *Handler) RequestWithdrawal(w http.ResponseWriter, r *http.Request) {
	// Pegar user ID do contexto (setado pelo middleware de auth)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreatePayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validar campos obrigatórios
	if req.Amount <= 0 {
		http.Error(w, "amount must be positive", http.StatusBadRequest)
		return
	}
	if req.PixKey == "" {
		http.Error(w, "pix_key is required", http.StatusBadRequest)
		return
	}
	if req.PixKeyType == "" {
		http.Error(w, "pix_key_type is required", http.StatusBadRequest)
		return
	}

	payout, err := h.service.RequestPayout(r.Context(), userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusCreated, payout)
}

// ListMyWithdrawals lista os saques do colaborador logado
func (h *Handler) ListMyWithdrawals(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	result, err := h.service.GetPayoutsByCollaboratorID(r.Context(), userID, page, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// GetWithdrawal busca um saque por ID
func (h *Handler) GetWithdrawal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	payout, err := h.service.GetPayoutByID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if payout == nil {
		http.Error(w, "payout not found", http.StatusNotFound)
		return
	}

	// Verificar se o payout pertence ao usuário
	if payout.CollaboratorID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	respondJSON(w, http.StatusOK, payout)
}

// ListAllWithdrawals lista todos os saques (admin) com filtro por status e paginacao
func (h *Handler) ListAllWithdrawals(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	result, err := h.service.ListAllPayouts(r.Context(), status, page, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// ApproveWithdrawal aprova um saque pendente
func (h *Handler) ApproveWithdrawal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	adminID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.service.ApprovePayout(r.Context(), id, adminID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "payout approved"})
}

// RejectWithdrawal rejeita um saque pendente e reembolsa o saldo
func (h *Handler) RejectWithdrawal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	adminID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req RejectPayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Reason == "" {
		http.Error(w, "reason is required", http.StatusBadRequest)
		return
	}

	if err := h.service.RejectPayout(r.Context(), id, adminID, req.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "payout rejected"})
}

// ----- Balance -----

// GetBalance retorna o saldo do colaborador
func (h *Handler) GetBalance(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	balance, err := h.service.GetCollaboratorBalance(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, balance)
}

// ----- Withdrawal Limits -----

// GetWithdrawalLimits retorna limites de saque + uso diario do colaborador
func (h *Handler) GetWithdrawalLimits(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	limits, err := h.service.GetWithdrawalLimitsForUser(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, limits)
}

// ----- Helpers -----

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}
