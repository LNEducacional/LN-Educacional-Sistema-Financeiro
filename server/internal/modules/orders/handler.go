package orders

import (
	"encoding/json"
	"errors"
	"financial-system/internal/modules/payment"
	"financial-system/internal/platform/middleware"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *ServiceLayer
}

func NewHandler(service *ServiceLayer) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.handleCreate)
	r.Get("/", h.handleList)
	r.Get("/my", h.handleListMy)
	r.Get("/student", h.handleListStudentOrders)
	r.Get("/{id}", h.handleGetByID)
	r.Get("/{id}/details", h.handleGetDetails)
	r.Post("/{id}/deliver", h.handleDeliver)
	r.Post("/{id}/approve", h.handleApprove)
	r.Post("/{id}/reject", h.handleReject)
	r.Post("/{id}/rate", h.handleRate)

	// Novas rotas do pipeline completo (Gap 1)
	r.Patch("/{id}/status", h.handleChangeOrderStatus)
	r.Post("/{id}/request-internal-review", h.handleRequestInternalReview)
	r.Get("/{id}/status-history", h.handleGetOrderStatusHistory)
}

type createOrderRequest struct {
	ServiceID      string `json:"service_id"`
	CollaboratorID string `json:"collaborator_id"`
	DueDate        string `json:"due_date"`
	BillingType    string `json:"billing_type,omitempty"` // PIX, BOLETO (default: PIX)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var req createOrderRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Parse due_date
	dueDate, err := time.Parse(time.RFC3339, req.DueDate)
	if err != nil {
		http.Error(w, "invalid due_date format, use RFC3339 (e.g., 2025-12-15T23:59:59Z)", http.StatusBadRequest)
		return
	}

	input := &CreateOrderInput{
		ServiceID:      req.ServiceID,
		CollaboratorID: req.CollaboratorID,
		DueDate:        dueDate,
	}

	// Determinar billing type (default: PIX)
	billingType := payment.BillingTypePIX
	if req.BillingType != "" {
		billingType = payment.BillingType(req.BillingType)
	}

	response, err := h.service.CreateWithPayment(r.Context(), userID, input, billingType)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidDueDate):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, ErrServiceNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, ErrCollaboratorNoWallet):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, ErrBelowMinCharge):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only ADMIN can list all orders
	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	orders, err := h.service.List(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *Handler) handleListMy(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	var orders []Order
	var err error

	switch userRole {
	case "STUDENT":
		orders, err = h.service.ListByStudentID(r.Context(), userID)
	case "COLLABORATOR":
		orders, err = h.service.ListByCollaboratorID(r.Context(), userID)
	case "ADMIN":
		orders, err = h.service.List(r.Context())
	default:
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *Handler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	order, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		if err == ErrOrderNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check authorization: user must own the order or be ADMIN
	if userRole != "ADMIN" && order.StudentID != userID && order.CollaboratorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

func (h *Handler) handleDeliver(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only COLLABORATOR can deliver
	if userRole != "COLLABORATOR" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	err := h.service.Deliver(r.Context(), id, userID)
	if err != nil {
		switch err {
		case ErrOrderNotFound:
			http.Error(w, err.Error(), http.StatusNotFound)
		case ErrInvalidOrderStatus:
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			if err.Error() == "order does not belong to this collaborator" {
				http.Error(w, err.Error(), http.StatusForbidden)
			} else {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "delivered"})
}

func (h *Handler) handleApprove(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only STUDENT or ADMIN can approve
	if userRole != "STUDENT" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	err := h.service.Approve(r.Context(), id, userID)
	if err != nil {
		switch err {
		case ErrOrderNotFound:
			http.Error(w, err.Error(), http.StatusNotFound)
		case ErrInvalidOrderStatus:
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			if err.Error() == "order does not belong to this student" {
				http.Error(w, err.Error(), http.StatusForbidden)
			} else {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "approved", "payment": "released"})
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func (h *Handler) handleReject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only STUDENT or ADMIN can reject
	if userRole != "STUDENT" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req rejectRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Reason == "" {
		http.Error(w, "reason is required", http.StatusBadRequest)
		return
	}

	err = h.service.RequestRevision(r.Context(), id, userID, req.Reason)
	if err != nil {
		switch err {
		case ErrOrderNotFound:
			http.Error(w, err.Error(), http.StatusNotFound)
		case ErrInvalidOrderStatus:
			http.Error(w, "order status does not allow rejection", http.StatusBadRequest)
		default:
			if err.Error() == "order does not belong to this student" {
				http.Error(w, err.Error(), http.StatusForbidden)
			} else {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "revision_requested"})
}

func (h *Handler) handleGetDetails(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	details, err := h.service.GetOrderDetails(r.Context(), id)
	if err != nil {
		if err == ErrOrderNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check authorization: user must own the order or be ADMIN
	if userRole != "ADMIN" && details.Order.StudentID != userID && details.Order.CollaboratorID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(details)
}

func (h *Handler) handleListStudentOrders(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only STUDENT or ADMIN can access this endpoint
	if userRole != "STUDENT" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	orders, err := h.service.ListByStudentWithDetails(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

type rateRequest struct {
	Score   int     `json:"score"`
	Comment *string `json:"comment"`
}

func (h *Handler) handleRate(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	// Only STUDENT or ADMIN can rate
	if userRole != "STUDENT" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req rateRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Score < 1 || req.Score > 5 {
		http.Error(w, "score must be between 1 and 5", http.StatusBadRequest)
		return
	}

	err = h.service.RateOrder(r.Context(), orderID, userID, req.Score, req.Comment)
	if err != nil {
		switch err {
		case ErrOrderNotFound:
			http.Error(w, err.Error(), http.StatusNotFound)
		case ErrInvalidOrderStatus:
			http.Error(w, "order must be completed before rating", http.StatusBadRequest)
		case ErrAlreadyRated:
			http.Error(w, "order has already been rated", http.StatusConflict)
		default:
			if err.Error() == "order does not belong to this student" {
				http.Error(w, err.Error(), http.StatusForbidden)
			} else {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "rated"})
}

// handleChangeOrderStatus - PATCH /api/orders/{id}/status
func (h *Handler) handleChangeOrderStatus(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	var req ChangeStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.ChangeOrderStatus(r.Context(), orderID, userID, userRole, req); err != nil {
		if strings.Contains(err.Error(), "não autorizado") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if strings.Contains(err.Error(), "transição inválida") {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status atualizado com sucesso"})
}

// handleRequestInternalReview - POST /api/orders/{id}/request-internal-review
func (h *Handler) handleRequestInternalReview(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	collaboratorID := r.Context().Value(middleware.UserIDKey).(string)

	var req InternalReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.RequestInternalReview(r.Context(), orderID, collaboratorID, req.Notes); err != nil {
		if strings.Contains(err.Error(), "não autorizado") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Revisão interna solicitada"})
}

// handleGetOrderStatusHistory - GET /api/orders/{id}/status-history
func (h *Handler) handleGetOrderStatusHistory(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	history, err := h.service.GetOrderStatusHistory(r.Context(), orderID, userID, userRole)
	if err != nil {
		if strings.Contains(err.Error(), "não autorizado") {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}
