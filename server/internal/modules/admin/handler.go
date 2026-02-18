package admin

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers admin report routes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/kpis", h.handleGetKPIs)
	r.Get("/financials/monthly", h.handleGetMonthlyFinancials)
	r.Get("/financials/weekly", h.handleGetWeeklyFinancials)
	r.Get("/delinquents", h.handleGetDelinquents)
	r.Get("/delinquents/export", h.handleExportDelinquentsCSV)
	r.Get("/delinquents/export-enhanced", h.handleExportDelinquentsEnhancedCSV)
	r.Post("/delinquency/check", h.handleRunDelinquencyCheck)
	r.Get("/delinquency/config", h.handleGetDelinquencyConfig)
	r.Get("/delinquency/history/{userId}", h.handleGetDelinquencyHistory)
	r.Get("/complaints", h.handleGetComplaintsPaginated)
	r.Get("/complaints/stats", h.handleGetComplaintStats)
	r.Get("/refunds", h.handleGetRefunds)
	r.Get("/revisions/summary", h.handleGetRevisionSummary)
	r.Get("/active-jobs", h.handleGetActiveJobs)
	r.Get("/alerts", h.handleGetAlerts)
	r.Get("/productivity", h.handleGetProductivityStats)
	r.Get("/pending-financials", h.handleGetPendingFinancials)
	r.Get("/pending-withdrawals", h.handleGetPendingWithdrawalsSummary)
	r.Get("/open-charges", h.handleGetOpenChargesSummary)
	// Ranking routes
	r.Get("/rankings", h.handleGetFullRanking)
	r.Get("/ranking/{type}", h.handleGetRanking)
	// Job management routes
	r.Get("/jobs/{id}/history", h.handleGetJobHistory)
	r.Patch("/jobs/{id}/status", h.handleUpdateJobStatus)
}

// RegisterCollaboratorRoutes registers collaborator management routes
func (h *Handler) RegisterCollaboratorRoutes(r chi.Router) {
	r.Get("/", h.handleListCollaboratorsPaginated)
	r.Post("/", h.handleCreateCollaborator)
	r.Get("/{id}", h.handleGetCollaboratorByID)
	r.Patch("/{id}", h.handleUpdateCollaborator)
	r.Get("/{id}/earnings", h.handleGetCollaboratorEarnings)
	r.Get("/{id}/revisions", h.handleGetCollaboratorRevisions)
	r.Get("/{id}/rankings", h.handleGetCollaboratorRankings)
	r.Get("/{id}/delinquents", h.handleGetCollaboratorDelinquents)
}

// handleGetKPIs returns financial KPIs
// GET /admin/reports/kpis
func (h *Handler) handleGetKPIs(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.service.GetFinancialKPIs(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch KPIs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(kpis)
}

// handleGetMonthlyFinancials returns income vs payouts chart data
// GET /admin/reports/financials/monthly?months=6
func (h *Handler) handleGetMonthlyFinancials(w http.ResponseWriter, r *http.Request) {
	monthsStr := r.URL.Query().Get("months")
	months := DefaultMonthsForChart
	if monthsStr != "" {
		if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 {
			months = m
		}
	}

	data, err := h.service.GetMonthlyFinancials(r.Context(), months)
	if err != nil {
		http.Error(w, "Failed to fetch monthly financials", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// handleGetDelinquents returns list of delinquent users
// GET /admin/reports/delinquents
func (h *Handler) handleGetDelinquents(w http.ResponseWriter, r *http.Request) {
	users, err := h.service.GetDelinquentUsers(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch delinquent users", http.StatusInternalServerError)
		return
	}

	// Return empty array instead of null
	if users == nil {
		users = []DelinquentUser{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// handleExportDelinquentsCSV streams delinquent users as CSV
// GET /admin/reports/delinquents/export
func (h *Handler) handleExportDelinquentsCSV(w http.ResponseWriter, r *http.Request) {
	// Set headers for CSV download
	filename := fmt.Sprintf("inadimplentes_%s.csv", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	// Add BOM for Excel UTF-8 compatibility
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	csvWriter := csv.NewWriter(w)

	// Write header
	csvWriter.Write([]string{
		"Nome",
		"Email",
		"Valor Total Devido (R$)",
		"Data Vencimento Mais Antiga",
		"Dias em Atraso",
		"Pedidos em Atraso",
		"Inadimplente Desde",
	})
	csvWriter.Flush()

	// Stream rows
	err := h.service.StreamDelinquentUsersCSV(r.Context(), func(du DelinquentUser) error {
		delinquentSince := ""
		if !du.DelinquentSince.IsZero() {
			delinquentSince = du.DelinquentSince.Format("02/01/2006")
		}

		record := []string{
			du.Name,
			du.Email,
			fmt.Sprintf("%.2f", du.TotalOwed),
			du.OldestDueDate.Format("02/01/2006"),
			strconv.Itoa(du.DaysOverdue),
			strconv.Itoa(du.OverdueOrders),
			delinquentSince,
		}
		if err := csvWriter.Write(record); err != nil {
			return err
		}
		csvWriter.Flush()
		return nil
	})

	if err != nil {
		// Can't change headers after body started, just log
		return
	}
}

// handleRunDelinquencyCheck manually triggers delinquency check
// POST /admin/reports/delinquency/check
func (h *Handler) handleRunDelinquencyCheck(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.RunDelinquencyCheck(r.Context())
	if err != nil {
		http.Error(w, "Failed to run delinquency check", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGetDelinquencyConfig returns current delinquency configuration
// GET /admin/reports/delinquency/config
func (h *Handler) handleGetDelinquencyConfig(w http.ResponseWriter, r *http.Request) {
	config := h.service.GetDelinquencyConfig()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// handleListCollaboratorsPaginated returns paginated collaborators with metrics
// GET /admin/collaborators?page=1&page_size=20&specialty=&min_rating=0
func (h *Handler) handleListCollaboratorsPaginated(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 20
	var minRating float64

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	specialty := r.URL.Query().Get("specialty")

	if minRatingStr := r.URL.Query().Get("min_rating"); minRatingStr != "" {
		if mr, err := strconv.ParseFloat(minRatingStr, 64); err == nil && mr > 0 {
			minRating = mr
		}
	}

	result, err := h.service.ListCollaboratorsPaginated(r.Context(), page, pageSize, specialty, minRating)
	if err != nil {
		http.Error(w, "Failed to fetch collaborators", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGetCollaboratorByID returns detailed info for a single collaborator
// GET /admin/collaborators/{id}
func (h *Handler) handleGetCollaboratorByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	collaborator, err := h.service.GetCollaboratorByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to fetch collaborator", http.StatusInternalServerError)
		return
	}

	if collaborator == nil {
		http.Error(w, "Collaborator not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(collaborator)
}

// handleGetComplaintsPaginated returns paginated complaints with split values and filters
// GET /admin/reports/complaints?page=1&page_size=20&status=&collaborator_id=&search=
func (h *Handler) handleGetComplaintsPaginated(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	status := r.URL.Query().Get("status")
	collaboratorID := r.URL.Query().Get("collaborator_id")
	search := r.URL.Query().Get("search")

	result, err := h.service.GetComplaintsPaginated(r.Context(), page, pageSize, status, collaboratorID, search)
	if err != nil {
		http.Error(w, "Failed to fetch complaints", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGetComplaintStats returns aggregated complaint statistics
// GET /admin/reports/complaints/stats
func (h *Handler) handleGetComplaintStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetComplaintStats(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch complaint stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleGetJobHistory returns the complete status history for a job
// GET /admin/reports/jobs/{id}/history
func (h *Handler) handleGetJobHistory(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "id")
	if jobID == "" {
		http.Error(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	history, err := h.service.GetJobHistory(r.Context(), jobID)
	if err != nil {
		http.Error(w, "Failed to fetch job history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// handleUpdateJobStatus changes the status of a job
// PATCH /admin/reports/jobs/{id}/status
func (h *Handler) handleUpdateJobStatus(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "id")
	if jobID == "" {
		http.Error(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	var req UpdateJobStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Status == "" {
		http.Error(w, "Status is required", http.StatusBadRequest)
		return
	}

	// Get user ID from context (assuming auth middleware sets it)
	// For now, use a placeholder - in production this should come from auth context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = "00000000-0000-0000-0000-000000000000" // Placeholder for admin
	}

	if err := h.service.UpdateJobStatus(r.Context(), jobID, userID, &req); err != nil {
		if err.Error() == "job not found" {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update job status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// handleGetRefunds returns refund report
// GET /admin/reports/refunds
func (h *Handler) handleGetRefunds(w http.ResponseWriter, r *http.Request) {
	report, err := h.service.GetRefunds(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch refunds", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// handleGetWeeklyFinancials returns income vs payouts for the last N weeks
// GET /admin/reports/financials/weekly?weeks=8
func (h *Handler) handleGetWeeklyFinancials(w http.ResponseWriter, r *http.Request) {
	weeksStr := r.URL.Query().Get("weeks")
	weeks := 8 // Default
	if weeksStr != "" {
		if w, err := strconv.Atoi(weeksStr); err == nil && w > 0 {
			weeks = w
		}
	}

	data, err := h.service.GetWeeklyFinancials(r.Context(), weeks)
	if err != nil {
		http.Error(w, "Failed to fetch weekly financials", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// handleGetRevisionSummary returns aggregated revision statistics
// GET /admin/reports/revisions/summary
func (h *Handler) handleGetRevisionSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.service.GetRevisionSummary(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch revision summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleGetActiveJobs returns paginated list of active jobs
// GET /admin/reports/active-jobs?page=1&page_size=20&status=&collaborator=&sort_by=due_date&sort_dir=asc
func (h *Handler) handleGetActiveJobs(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	status := r.URL.Query().Get("status")
	collaboratorID := r.URL.Query().Get("collaborator")
	sortBy := r.URL.Query().Get("sort_by")
	sortDir := r.URL.Query().Get("sort_dir")

	data, err := h.service.GetActiveJobs(r.Context(), page, pageSize, status, collaboratorID, sortBy, sortDir)
	if err != nil {
		http.Error(w, "Failed to fetch active jobs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// handleGetAlerts returns alert items for overdue, due today, due tomorrow and complaints
// GET /admin/reports/alerts
func (h *Handler) handleGetAlerts(w http.ResponseWriter, r *http.Request) {
	alerts, err := h.service.GetAlerts(r.Context())
	if err != nil {
		log.Printf("GetAlerts error: %v", err)
		http.Error(w, "Failed to fetch alerts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}

// handleGetProductivityStats returns aggregated productivity metrics
// GET /admin/reports/productivity
func (h *Handler) handleGetProductivityStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetProductivityStats(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch productivity stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// handleGetFullRanking returns all 5 ranking types
// GET /admin/reports/rankings?limit=10
func (h *Handler) handleGetFullRanking(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	rankings, err := h.service.GetFullRanking(r.Context(), limit)
	if err != nil {
		http.Error(w, "Failed to fetch rankings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rankings)
}

// handleGetRanking returns a specific ranking type
// GET /admin/reports/ranking/{type}?limit=10
// type can be: production, revenue, punctuality, satisfaction, quality
func (h *Handler) handleGetRanking(w http.ResponseWriter, r *http.Request) {
	rankingTypeStr := chi.URLParam(r, "type")
	if rankingTypeStr == "" {
		http.Error(w, "Missing ranking type", http.StatusBadRequest)
		return
	}

	// Validate ranking type
	var rankingType RankingType
	switch rankingTypeStr {
	case "production":
		rankingType = RankingTypeProduction
	case "revenue":
		rankingType = RankingTypeRevenue
	case "punctuality":
		rankingType = RankingTypePunctuality
	case "satisfaction":
		rankingType = RankingTypeSatisfaction
	case "quality":
		rankingType = RankingTypeQuality
	default:
		http.Error(w, "Invalid ranking type. Valid types: production, revenue, punctuality, satisfaction, quality", http.StatusBadRequest)
		return
	}

	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	ranking, err := h.service.GetRanking(r.Context(), rankingType, limit)
	if err != nil {
		http.Error(w, "Failed to fetch ranking", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ranking)
}

// handleUpdateCollaborator updates a collaborator's profile
// PATCH /admin/collaborators/{id}
func (h *Handler) handleUpdateCollaborator(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	var req UpdateCollaboratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate that at least one field is being updated
	if req.Specialty == nil && req.PixKey == nil && req.InternalRanking == nil {
		http.Error(w, "At least one field must be provided for update", http.StatusBadRequest)
		return
	}

	// Validate internal_ranking if provided
	if req.InternalRanking != nil && (*req.InternalRanking < 0 || *req.InternalRanking > 5) {
		http.Error(w, "internal_ranking must be between 0 and 5", http.StatusBadRequest)
		return
	}

	if err := h.service.UpdateCollaborator(r.Context(), id, &req); err != nil {
		http.Error(w, "Failed to update collaborator", http.StatusInternalServerError)
		return
	}

	// Return updated collaborator
	collaborator, err := h.service.GetCollaboratorByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to fetch updated collaborator", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(collaborator)
}

// handleCreateCollaborator creates a new collaborator
// POST /admin/collaborators
func (h *Handler) handleCreateCollaborator(w http.ResponseWriter, r *http.Request) {
	var req CreateCollaboratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}
	if req.Password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Validate internal_ranking if provided
	if req.InternalRanking != nil && (*req.InternalRanking < 0 || *req.InternalRanking > 5) {
		http.Error(w, "internal_ranking must be between 0 and 5", http.StatusBadRequest)
		return
	}

	collabID, err := h.service.CreateCollaborator(r.Context(), &req)
	if err != nil {
		if err.Error() == "email already registered" {
			http.Error(w, "Email already registered", http.StatusConflict)
			return
		}
		http.Error(w, "Failed to create collaborator", http.StatusInternalServerError)
		return
	}

	// Return the created collaborator
	collaborator, err := h.service.GetCollaboratorByID(r.Context(), collabID)
	if err != nil {
		http.Error(w, "Failed to fetch created collaborator", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(collaborator)
}

// handleGetCollaboratorEarnings returns earnings grouped by period
// GET /admin/collaborators/{id}/earnings?months=6
func (h *Handler) handleGetCollaboratorEarnings(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	months := 6
	if monthsStr := r.URL.Query().Get("months"); monthsStr != "" {
		if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 {
			months = m
		}
	}

	earnings, err := h.service.GetCollaboratorEarnings(r.Context(), id, months)
	if err != nil {
		http.Error(w, "Failed to fetch earnings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(earnings)
}

// handleGetCollaboratorRevisions returns paginated revisions for a collaborator
// GET /admin/collaborators/{id}/revisions?page=1&page_size=20
func (h *Handler) handleGetCollaboratorRevisions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	page := 1
	pageSize := 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	revisions, err := h.service.GetCollaboratorRevisions(r.Context(), id, page, pageSize)
	if err != nil {
		http.Error(w, "Failed to fetch revisions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(revisions)
}

// handleGetCollaboratorRankings returns the collaborator's positions in all 5 rankings
// GET /admin/collaborators/{id}/rankings
func (h *Handler) handleGetCollaboratorRankings(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	rankings, err := h.service.GetCollaboratorRankingPositions(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to fetch rankings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rankings)
}

// handleGetCollaboratorDelinquents returns delinquent students for this collaborator
// GET /admin/collaborators/{id}/delinquents
func (h *Handler) handleGetCollaboratorDelinquents(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing collaborator ID", http.StatusBadRequest)
		return
	}

	delinquents, err := h.service.GetDelinquentsByCollaborator(r.Context(), id)
	if err != nil {
		http.Error(w, "Failed to fetch delinquents", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(delinquents)
}

// handleGetPendingFinancials returns pending financial summary with breakdown by status
// GET /admin/reports/pending-financials
func (h *Handler) handleGetPendingFinancials(w http.ResponseWriter, r *http.Request) {
	report, err := h.service.GetPendingFinancials(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch pending financials", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// handleGetDelinquencyHistory returns the complete delinquency history for a user
// GET /admin/reports/delinquency/history/{userId}
func (h *Handler) handleGetDelinquencyHistory(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	if userID == "" {
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	history, err := h.service.GetDelinquencyHistory(r.Context(), userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch delinquency history: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// handleExportDelinquentsEnhancedCSV exports delinquent users with CPF, phone and history to CSV
// GET /admin/reports/delinquents/export-enhanced
func (h *Handler) handleExportDelinquentsEnhancedCSV(w http.ResponseWriter, r *http.Request) {
	filename := fmt.Sprintf("inadimplentes_completo_%s.csv", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// UTF-8 BOM for Excel
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	// Header with enhanced fields
	header := []string{
		"Nome",
		"Email",
		"CPF",
		"Telefone",
		"Valor Total Devido (R$)",
		"Data Vencimento Mais Antiga",
		"Dias em Atraso",
		"Pedidos em Atraso",
		"Inadimplente Desde",
		"Periodos Anteriores",
		"Total Dias Inadimplente",
	}
	if err := csvWriter.Write(header); err != nil {
		http.Error(w, "Failed to write CSV header", http.StatusInternalServerError)
		return
	}

	err := h.service.StreamDelinquentUsersWithHistory(r.Context(), func(du DelinquentUserWithHistory) error {
		cpf := ""
		if du.CPF != nil {
			cpf = *du.CPF
		}
		phone := ""
		if du.Phone != nil {
			phone = *du.Phone
		}

		record := []string{
			du.Name,
			du.Email,
			cpf,
			phone,
			fmt.Sprintf("%.2f", du.TotalOwed),
			du.OldestDueDate.Format("02/01/2006"),
			strconv.Itoa(du.DaysOverdue),
			strconv.Itoa(du.OverdueOrders),
			du.DelinquentSince.Format("02/01/2006"),
			strconv.Itoa(du.PreviousPeriods),
			strconv.Itoa(du.TotalDaysEver),
		}
		return csvWriter.Write(record)
	})

	if err != nil {
		http.Error(w, "Failed to stream delinquent users", http.StatusInternalServerError)
		return
	}
}

// handleGetPendingWithdrawalsSummary returns aggregated payout summary by status
// GET /admin/reports/pending-withdrawals
func (h *Handler) handleGetPendingWithdrawalsSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.service.GetPendingWithdrawalsSummary(r.Context())
	if err != nil {
		log.Printf("[ERROR] Failed to fetch pending withdrawals summary: %v", err)
		http.Error(w, "Failed to fetch pending withdrawals summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// handleGetOpenChargesSummary returns aggregated charge summary by status
// GET /admin/reports/open-charges
func (h *Handler) handleGetOpenChargesSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.service.GetOpenChargesSummary(r.Context())
	if err != nil {
		log.Printf("[ERROR] Failed to fetch open charges summary: %v", err)
		http.Error(w, "Failed to fetch open charges summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}
