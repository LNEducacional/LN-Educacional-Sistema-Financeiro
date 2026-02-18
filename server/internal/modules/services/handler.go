package services

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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
	r.Get("/stats", h.handleStats)
	r.Get("/{id}", h.handleGetByID)
	r.Put("/{id}", h.handleUpdate)
	r.Delete("/{id}", h.handleDelete)
	r.Patch("/{id}/toggle", h.handleToggleActive)
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req CreateServiceRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	service, err := h.service.Create(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidSplit), errors.Is(err, ErrInvalidName), errors.Is(err, ErrInvalidValue), errors.Is(err, ErrBelowMinCharge):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(service)
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")
	search := r.URL.Query().Get("search")
	area := r.URL.Query().Get("area")
	includeInactive := r.URL.Query().Get("include_inactive") == "true"

	page := 1
	pageSize := 20

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil {
			page = p
		}
	}
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil {
			pageSize = ps
		}
	}

	// If no pagination params, return simple list (backwards compatible)
	if pageStr == "" && pageSizeStr == "" && search == "" && area == "" && !includeInactive {
		services, err := h.service.List(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(services)
		return
	}

	// Return paginated response
	response, err := h.service.ListPaginated(r.Context(), page, pageSize, search, area, includeInactive)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	service, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		if err == ErrServiceNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(service)
}

func (h *Handler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req UpdateServiceRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	service, err := h.service.Update(r.Context(), id, &req)
	if err != nil {
		switch {
		case errors.Is(err, ErrServiceNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, ErrInvalidSplit), errors.Is(err, ErrInvalidName), errors.Is(err, ErrInvalidValue), errors.Is(err, ErrBelowMinCharge):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(service)
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	err := h.service.Delete(r.Context(), id)
	if err != nil {
		if err == ErrServiceNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetStats(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *Handler) handleToggleActive(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	service, err := h.service.ToggleActive(r.Context(), id)
	if err != nil {
		if err == ErrServiceNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(service)
}
