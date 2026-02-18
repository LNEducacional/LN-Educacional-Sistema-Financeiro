package users

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"financial-system/internal/platform/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r *chi.Mux) {
	r.Post("/auth/register", h.handleRegister)
	r.Post("/auth/login", h.handleLogin)
	r.Post("/auth/refresh", h.handleRefresh)
	r.Post("/auth/forgot-password", h.handleForgotPassword)
	r.Post("/auth/reset-password", h.handleResetPassword)
	r.Post("/auth/validate-reset-token", h.handleValidateResetToken)
}

func (h *Handler) RegisterProtectedRoutes(r chi.Router) {
	r.Post("/auth/logout", h.handleLogout)
	r.Post("/auth/logout-all", h.handleLogoutAll)
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.service.Register(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.service.Login(r.Context(), &req)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) || errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func (h *Handler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.RefreshToken == "" {
		http.Error(w, "Refresh token is required", http.StatusBadRequest)
		return
	}

	res, err := h.service.RefreshTokens(r.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) || errors.Is(err, ErrTokenRevoked) ||
			errors.Is(err, ErrTokenExpired) || errors.Is(err, ErrTokenReused) {
			http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.RefreshToken == "" {
		http.Error(w, "Refresh token is required", http.StatusBadRequest)
		return
	}

	err = h.service.Logout(r.Context(), req.RefreshToken)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleLogoutAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "User not found in context", http.StatusUnauthorized)
		return
	}

	err := h.service.LogoutAll(r.Context(), userID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	// Always return success to prevent email enumeration attacks
	err = h.service.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		// Log error but don't reveal it to client (security)
		if errors.Is(err, ErrEmailServiceUnavailable) {
			http.Error(w, "Email service temporarily unavailable", http.StatusServiceUnavailable)
			return
		}
		// For other errors, still return success to prevent enumeration
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "If this email exists, a password reset link will be sent",
	})
}

func (h *Handler) handleValidateResetToken(w http.ResponseWriter, r *http.Request) {
	var req ValidateTokenRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	err = h.service.ValidatePasswordResetToken(r.Context(), req.Token)
	if err != nil {
		if errors.Is(err, ErrPasswordResetTokenUsed) {
			http.Error(w, "Token has already been used", http.StatusGone)
			return
		}
		if errors.Is(err, ErrPasswordResetExpired) {
			http.Error(w, "Token has expired", http.StatusGone)
			return
		}
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"valid": true})
}

func (h *Handler) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	err = h.service.ResetPassword(r.Context(), req.Token, req.NewPassword)
	if err != nil {
		if errors.Is(err, ErrPasswordResetTokenUsed) {
			http.Error(w, "Token has already been used", http.StatusGone)
			return
		}
		if errors.Is(err, ErrPasswordResetExpired) {
			http.Error(w, "Token has expired", http.StatusGone)
			return
		}
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Password reset successfully",
	})
}
