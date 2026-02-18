package notifications

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"financial-system/internal/platform/middleware"
)

// Handler gerencia requisições HTTP para notificações
type Handler struct {
	service *ServiceLayer
}

// NewHandler cria uma nova instância de Handler
func NewHandler(service *ServiceLayer) *Handler {
	return &Handler{service: service}
}

// getUserIDFromContext extrai userID do contexto com validação defensiva
func getUserIDFromContext(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	return userID, ok
}

// RegisterRoutes registra as rotas do módulo
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.handleGetNotifications)
	r.Get("/stats", h.handleGetStats)
	r.Post("/mark-read", h.handleMarkAsRead)
	r.Post("/mark-all-read", h.handleMarkAllAsRead)
	r.Get("/stream", h.handleSSE) // SSE endpoint
}

// handleGetNotifications retorna notificações do usuário
func (h *Handler) handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Query params
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	unreadOnlyStr := r.URL.Query().Get("unread_only")
	typeStr := r.URL.Query().Get("type")

	limit := 50 // default
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

	unreadOnly := unreadOnlyStr == "true"

	var notificationType *NotificationType
	if typeStr != "" {
		t := NotificationType(typeStr)
		notificationType = &t
	}

	notifications, err := h.service.GetUserNotifications(r.Context(), userID, limit, offset, unreadOnly, notificationType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// handleGetStats retorna estatísticas de notificações
func (h *Handler) handleGetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	stats, err := h.service.GetStats(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleMarkAsRead marca notificações como lidas
func (h *Handler) handleMarkAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var req MarkAsReadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.NotificationIDs) == 0 {
		http.Error(w, "notification_ids is required", http.StatusBadRequest)
		return
	}

	if err := h.service.MarkAsRead(r.Context(), userID, req.NotificationIDs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Notificações marcadas como lidas"})
}

// handleMarkAllAsRead marca todas as notificações como lidas
func (h *Handler) handleMarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	if err := h.service.MarkAllAsRead(r.Context(), userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Todas as notificações marcadas como lidas"})
}

// handleSSE streaming endpoint para notificações em tempo real
func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Configurar headers SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Enviar header inicial
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Subscribe to notifications
	notificationChan := h.service.Subscribe(userID)
	defer h.service.Unsubscribe(userID, notificationChan)

	// Enviar ping inicial
	fmt.Fprintf(w, "data: {\"type\":\"connected\"}\n\n")
	flusher.Flush()

	// Listen for notifications or client disconnect
	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			// Cliente desconectou
			return
		case notification, ok := <-notificationChan:
			if !ok {
				// Canal fechado
				return
			}

			// Serializar notificação
			data, err := json.Marshal(notification)
			if err != nil {
				continue
			}

			// Enviar via SSE
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
