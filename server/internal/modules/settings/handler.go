package settings

import (
	"encoding/json"
	"financial-system/internal/platform/middleware"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registra as rotas do modulo de configuracoes
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.handleGetSettings)
	r.Get("/withdrawal-limits", h.handleGetWithdrawalLimits)
	r.Patch("/{key}", h.handleUpdateSetting)
	r.Post("/test-asaas", h.handleTestAsaas)
}

// handleGetSettings retorna as configuracoes ASAAS (valores mascarados)
func (h *Handler) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.service.GetAsaasSettings(r.Context())
	if err != nil {
		http.Error(w, "Erro ao buscar configuracoes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// handleUpdateSetting atualiza uma configuracao
func (h *Handler) handleUpdateSetting(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if key == "" {
		http.Error(w, "Chave obrigatoria", http.StatusBadRequest)
		return
	}

	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON invalido", http.StatusBadRequest)
		return
	}

	// Obter ID do usuario do contexto
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "Usuario nao autenticado", http.StatusUnauthorized)
		return
	}

	err := h.service.UpdateSetting(r.Context(), key, req.Value, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Configuracao atualizada com sucesso",
	})
}

// handleGetWithdrawalLimits retorna os limites de saque configurados
func (h *Handler) handleGetWithdrawalLimits(w http.ResponseWriter, r *http.Request) {
	limits, err := h.service.GetWithdrawalLimits(r.Context())
	if err != nil {
		http.Error(w, "Erro ao buscar limites de saque", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(limits)
}

// handleTestAsaas testa a conexao com a API do ASAAS
func (h *Handler) handleTestAsaas(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.TestAsaasConnection(r.Context())
	if err != nil {
		http.Error(w, "Erro ao testar conexao", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
