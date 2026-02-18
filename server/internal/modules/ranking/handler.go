package ranking

import (
	"encoding/json"
	"net/http"

	"financial-system/internal/platform/middleware"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers ranking routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.handleGetRanking)
	r.Get("/summary", h.handleGetRankingSummary)
}

// handleGetRanking returns the ranking for a given criteria and period
// GET /api/ranking?criteria=productivity&period=this_month
func (h *Handler) handleGetRanking(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get criteria from query params, default to productivity
	criteria := RankingCriteria(r.URL.Query().Get("criteria"))
	if criteria == "" {
		criteria = CriteriaProductivity
	}

	// Get period from query params, default to this_month
	period := RankingPeriod(r.URL.Query().Get("period"))
	if period == "" {
		period = PeriodThisMonth
	}

	result, err := h.service.GetRanking(r.Context(), criteria, period, userID)
	if err != nil {
		switch err {
		case ErrInvalidCriteria:
			http.Error(w, "invalid criteria: must be productivity, revenue, punctuality, or quality", http.StatusBadRequest)
		case ErrInvalidPeriod:
			http.Error(w, "invalid period: must be this_month or all_time", http.StatusBadRequest)
		default:
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGetRankingSummary returns user's position across all 5 criteria
// GET /api/ranking/summary
func (h *Handler) handleGetRankingSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	result, err := h.service.GetRankingSummary(r.Context(), userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

type rateOrderRequest struct {
	Score   int     `json:"score"`
	Comment *string `json:"comment"`
}

type rateOrderResponse struct {
	Status string  `json:"status"`
	Rating *Rating `json:"rating,omitempty"`
}
