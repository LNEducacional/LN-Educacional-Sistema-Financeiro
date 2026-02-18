package production

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"financial-system/internal/platform/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.handleCreate)
	r.Get("/", h.handleList)
	r.Get("/my", h.handleListMy)
	r.Get("/delayed", h.handleDelayed)
	r.Get("/ranking", h.handleRankingAll)
	r.Get("/ranking/my", h.handleMyRanking)
	r.Get("/financial/summary", h.handleFinancialSummary)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", h.handleGetByID)
		r.Get("/history", h.handleGetHistory)
		r.Post("/status", h.handleChangeStatus)
		r.Post("/assign", h.handleAssign)
	})
	r.Get("/student/{studentId}/delinquency", h.handleCheckDelinquency)
}

// Request/Response DTOs

type CreateJobRequest struct {
	Title          string    `json:"title"`
	Description    *string   `json:"description"`
	Price          float64   `json:"price"`
	Deadline       time.Time `json:"deadline"`
	StudentID      string    `json:"student_id"`
	CollaboratorID *string   `json:"collaborator_id"`
}

type ChangeStatusRequest struct {
	NewStatus string  `json:"new_status"`
	Comment   *string `json:"comment"`
}

type AssignCollaboratorRequest struct {
	CollaboratorID string `json:"collaborator_id"`
}

type FinancialSummaryResponse struct {
	TotalApproved  float64 `json:"total_approved"`
	TotalCompleted float64 `json:"total_completed"`
	TotalPending   float64 `json:"total_pending"`
	WeeklyPayable  float64 `json:"weekly_payable"`
	JobsCount      int     `json:"jobs_count"`
}

type DelinquencyResponse struct {
	StudentID    string `json:"student_id"`
	IsDelinquent bool   `json:"is_delinquent"`
}

// Handlers

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req CreateJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Price <= 0 || req.StudentID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	job := &ProductionJob{
		Title:          req.Title,
		Description:    req.Description,
		Price:          req.Price,
		Deadline:       req.Deadline,
		StudentID:      req.StudentID,
		CollaboratorID: req.CollaboratorID,
	}

	if err := h.service.CreateJob(r.Context(), job); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create initial history
	_ = userID // Used in service.CreateJob for history

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(job)
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	jobs, err := h.service.ListJobs(r.Context(), ListFilters{Limit: 100, Offset: 0})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

func (h *Handler) handleListMy(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	var jobs []ProductionJob
	var err error

	switch userRole {
	case "COLLABORATOR":
		jobs, err = h.service.ListJobsByCollaborator(r.Context(), userID)
	case "STUDENT":
		jobs, err = h.service.ListJobsByStudent(r.Context(), userID)
	case "ADMIN":
		jobs, err = h.service.ListJobs(r.Context(), ListFilters{Limit: 100, Offset: 0})
	default:
		http.Error(w, "Unknown role", http.StatusForbidden)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

func (h *Handler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)
	jobID := chi.URLParam(r, "id")

	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		if err == ErrJobNotFound {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check access: ADMIN can see all, others only their own
	if userRole != "ADMIN" {
		hasAccess := job.StudentID == userID || (job.CollaboratorID != nil && *job.CollaboratorID == userID)
		if !hasAccess {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(job)
}

func (h *Handler) handleGetHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)
	jobID := chi.URLParam(r, "id")

	// First check access to job
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		if err == ErrJobNotFound {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if userRole != "ADMIN" {
		hasAccess := job.StudentID == userID || (job.CollaboratorID != nil && *job.CollaboratorID == userID)
		if !hasAccess {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	history, err := h.service.GetJobHistory(r.Context(), jobID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func (h *Handler) handleChangeStatus(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	jobID := chi.URLParam(r, "id")

	var req ChangeStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	input := ChangeStatusInput{
		JobID:     jobID,
		NewStatus: ProductionJobStatus(req.NewStatus),
		UserID:    userID,
		Comment:   req.Comment,
	}

	if err := h.service.ChangeStatus(r.Context(), input); err != nil {
		switch err {
		case ErrJobNotFound:
			http.Error(w, "Job not found", http.StatusNotFound)
		case ErrInvalidTransition:
			http.Error(w, err.Error(), http.StatusBadRequest)
		case ErrCommentRequired:
			http.Error(w, err.Error(), http.StatusBadRequest)
		case ErrAlreadyProcessed:
			http.Error(w, err.Error(), http.StatusConflict)
		case ErrNoCollaboratorAssigned:
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	// Return updated job
	job, _ := h.service.GetJob(r.Context(), jobID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(job)
}

func (h *Handler) handleAssign(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)
	jobID := chi.URLParam(r, "id")

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req AssignCollaboratorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.AssignCollaborator(r.Context(), jobID, req.CollaboratorID, userID); err != nil {
		if err == ErrJobNotFound {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	job, _ := h.service.GetJob(r.Context(), jobID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(job)
}

func (h *Handler) handleDelayed(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	jobs, err := h.service.GetDelayedJobs(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

func (h *Handler) handleRankingAll(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// For now, return empty array - full ranking requires listing all collaborators
	// This would be enhanced to call a ranking service method
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]CollaboratorRankingResult{})
}

func (h *Handler) handleMyRanking(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	if userRole != "COLLABORATOR" && userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	ranking, err := h.service.GetCollaboratorRanking(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ranking)
}

func (h *Handler) handleFinancialSummary(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	userRole := r.Context().Value(middleware.UserRoleKey).(string)

	var jobs []ProductionJob
	var err error

	switch userRole {
	case "COLLABORATOR":
		jobs, err = h.service.ListJobsByCollaborator(r.Context(), userID)
	case "ADMIN":
		jobs, err = h.service.ListJobs(r.Context(), ListFilters{Limit: 1000, Offset: 0})
	default:
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate summary
	var totalApproved, totalCompleted, totalPending, weeklyPayable float64
	weekAgo := time.Now().AddDate(0, 0, -7)

	for _, job := range jobs {
		switch job.Status {
		case StatusAprovado:
			totalApproved += job.Price
			if job.UpdatedAt.After(weekAgo) {
				weeklyPayable += job.Price
			}
		case StatusConcluido:
			totalCompleted += job.Price
		case StatusNovo, StatusEmAndamento, StatusAguardandoRevisao, StatusEnviadoVisualizacao, StatusAguardandoAprovacao:
			totalPending += job.Price
		}
	}

	summary := FinancialSummaryResponse{
		TotalApproved:  totalApproved,
		TotalCompleted: totalCompleted,
		TotalPending:   totalPending,
		WeeklyPayable:  weeklyPayable,
		JobsCount:      len(jobs),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func (h *Handler) handleCheckDelinquency(w http.ResponseWriter, r *http.Request) {
	userRole := r.Context().Value(middleware.UserRoleKey).(string)
	studentID := chi.URLParam(r, "studentId")

	if userRole != "ADMIN" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	isDelinquent, err := h.service.CheckStudentDelinquency(r.Context(), studentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := DelinquencyResponse{
		StudentID:    studentID,
		IsDelinquent: isDelinquent,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
