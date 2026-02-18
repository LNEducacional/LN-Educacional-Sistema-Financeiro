package disputes

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"financial-system/internal/platform/middleware"
)

// Handler gerencia requisições HTTP para disputas
type Handler struct {
	service *ServiceLayer
}

// NewHandler cria uma nova instância de Handler
func NewHandler(service *ServiceLayer) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registra as rotas do módulo
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.handleCreateDispute)
	r.Get("/", h.handleGetDisputes) // Admin: lista todas
	r.Get("/{id}", h.handleGetDisputeDetails)
	r.Post("/{id}/comments", h.handleAddComment)
	r.Post("/{id}/evidence", h.handleAddEvidence)
	r.Patch("/{id}/status", h.handleUpdateStatus)
	r.Post("/{id}/resolve", h.handleResolveDispute) // Admin only
	r.Get("/order/{orderID}", h.handleGetDisputesByOrder)
}

// handleCreateDispute cria uma nova disputa
func (h *Handler) handleCreateDispute(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	var req CreateDisputeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	dispute, err := h.service.CreateDispute(r.Context(), &req, userID, userRole)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(dispute)
}

// handleGetDisputes lista disputas (admin vê todas, outros veem as suas)
func (h *Handler) handleGetDisputes(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Apenas admin/financeiro pode listar todas as disputas
	if userRole != "ADMIN" && userRole != "FINANCEIRO" {
		http.Error(w, "acesso negado", http.StatusForbidden)
		return
	}

	// Query params
	statusStr := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	var status *DisputeStatus
	if statusStr != "" {
		s := DisputeStatus(statusStr)
		status = &s
	}

	limit := 50
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	offset := 0
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	disputes, err := h.service.GetAllDisputes(r.Context(), status, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disputes)
}

// handleGetDisputeDetails busca detalhes de uma disputa
func (h *Handler) handleGetDisputeDetails(w http.ResponseWriter, r *http.Request) {
	disputeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Validar acesso
	if err := h.service.ValidateAccess(r.Context(), disputeID, userID, userRole); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	details, err := h.service.GetDisputeWithDetails(r.Context(), disputeID, userRole)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(details)
}

// handleGetDisputesByOrder busca disputas de um pedido
func (h *Handler) handleGetDisputesByOrder(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Apenas admin/financeiro pode listar disputas por pedido
	if userRole != "ADMIN" && userRole != "FINANCEIRO" {
		http.Error(w, "acesso negado", http.StatusForbidden)
		return
	}

	orderID := chi.URLParam(r, "orderID")

	disputes, err := h.service.GetDisputesByOrder(r.Context(), orderID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disputes)
}

// handleAddComment adiciona um comentário à disputa
func (h *Handler) handleAddComment(w http.ResponseWriter, r *http.Request) {
	disputeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Validar acesso
	if err := h.service.ValidateAccess(r.Context(), disputeID, userID, userRole); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var req AddCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	comment, err := h.service.AddComment(r.Context(), disputeID, userID, userRole, &req)
	if err != nil {
		if strings.Contains(err.Error(), "apenas admins") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// handleAddEvidence adiciona evidência à disputa
func (h *Handler) handleAddEvidence(w http.ResponseWriter, r *http.Request) {
	disputeID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Validar acesso
	if err := h.service.ValidateAccess(r.Context(), disputeID, userID, userRole); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var req UploadEvidenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	evidence, err := h.service.AddEvidence(r.Context(), disputeID, userID, userRole, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(evidence)
}

// handleUpdateStatus atualiza o status da disputa (admin/financeiro)
func (h *Handler) handleUpdateStatus(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)
	if userRole != "ADMIN" && userRole != "FINANCEIRO" {
		http.Error(w, "acesso negado", http.StatusForbidden)
		return
	}

	disputeID := chi.URLParam(r, "id")

	var req struct {
		Status DisputeStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.UpdateStatus(r.Context(), disputeID, req.Status); err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status atualizado com sucesso"})
}

// handleResolveDispute resolve a disputa (admin/financeiro)
func (h *Handler) handleResolveDispute(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "ADMIN" && userRole != "FINANCEIRO" {
		http.Error(w, "acesso negado", http.StatusForbidden)
		return
	}

	disputeID := chi.URLParam(r, "id")

	var req ResolveDisputeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.ResolveDispute(r.Context(), disputeID, userID, &req); err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Disputa resolvida com sucesso"})
}
