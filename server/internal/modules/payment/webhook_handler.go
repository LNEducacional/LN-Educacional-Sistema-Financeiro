package payment

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	asaaspkg "financial-system/internal/platform/payment"
)

// WebhookHandler para processar webhooks do ASAAS
type WebhookHandler struct {
	service      Service
	webhookToken string
}

// NewWebhookHandler cria um novo handler de webhooks
func NewWebhookHandler(service Service, webhookToken string) *WebhookHandler {
	return &WebhookHandler{
		service:      service,
		webhookToken: webhookToken,
	}
}

// RegisterPublicRoutes registra as rotas públicas de webhook (sem auth JWT)
func (h *WebhookHandler) RegisterPublicRoutes(r chi.Router) {
	r.Post("/webhooks/asaas", h.HandleAsaasWebhook)
}

// HandleAsaasWebhook processa webhooks recebidos do ASAAS
func (h *WebhookHandler) HandleAsaasWebhook(w http.ResponseWriter, r *http.Request) {
	// Validar token de acesso (header asaas-access-token)
	token := r.Header.Get("asaas-access-token")
	if h.webhookToken != "" && token != h.webhookToken {
		log.Printf("Webhook: invalid access token")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Ler body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Webhook: error reading body: %v", err)
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse evento
	var event asaaspkg.WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("Webhook: error parsing JSON: %v", err)
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Gerar ID único para o evento (para idempotência)
	eventID := generateEventID(event)

	// Verificar se já foi processado (idempotência)
	processed, err := h.service.IsWebhookProcessed(r.Context(), eventID)
	if err != nil {
		log.Printf("Webhook: error checking idempotency: %v", err)
		// Não retornar erro para evitar reenvios
		w.WriteHeader(http.StatusOK)
		return
	}
	if processed {
		log.Printf("Webhook: event %s already processed", eventID)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Logar evento antes de processar
	if err := h.service.LogWebhook(r.Context(), eventID, event.Event, string(body)); err != nil {
		log.Printf("Webhook: error logging event: %v", err)
	}

	// Processar evento baseado no tipo
	switch event.Event {
	// Payment events
	case "PAYMENT_CREATED":
		log.Printf("Webhook: payment created %s", getPaymentID(event.Payment))
		// Apenas log, não precisa de ação

	case "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED":
		log.Printf("Webhook: payment %s for %s", event.Event, getPaymentID(event.Payment))
		if event.Payment != nil {
			if err := h.service.HandlePaymentWebhook(r.Context(), eventID, event.Event, event.Payment); err != nil {
				log.Printf("Webhook: error handling payment event: %v", err)
			}
		}

	case "PAYMENT_OVERDUE":
		log.Printf("Webhook: payment overdue %s", getPaymentID(event.Payment))
		if event.Payment != nil {
			if err := h.service.HandlePaymentWebhook(r.Context(), eventID, event.Event, event.Payment); err != nil {
				log.Printf("Webhook: error handling overdue event: %v", err)
			}
		}

	case "PAYMENT_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS":
		log.Printf("Webhook: payment refunded %s", getPaymentID(event.Payment))
		if event.Payment != nil {
			if err := h.service.HandlePaymentWebhook(r.Context(), eventID, event.Event, event.Payment); err != nil {
				log.Printf("Webhook: error handling refund event: %v", err)
			}
		}

	// Transfer events
	case "TRANSFER_CREATED":
		log.Printf("Webhook: transfer created %s", getTransferID(event.Transfer))
		// Apenas log

	case "TRANSFER_PENDING", "TRANSFER_IN_BANK_PROCESSING":
		log.Printf("Webhook: transfer %s for %s", event.Event, getTransferID(event.Transfer))
		// Status intermediário, não precisa de ação

	case "TRANSFER_DONE":
		log.Printf("Webhook: transfer done %s", getTransferID(event.Transfer))
		if event.Transfer != nil {
			if err := h.service.HandleTransferWebhook(r.Context(), eventID, event.Event, event.Transfer); err != nil {
				log.Printf("Webhook: error handling transfer done: %v", err)
			}
		}

	case "TRANSFER_FAILED", "TRANSFER_CANCELLED":
		log.Printf("Webhook: transfer %s for %s", event.Event, getTransferID(event.Transfer))
		if event.Transfer != nil {
			if err := h.service.HandleTransferWebhook(r.Context(), eventID, event.Event, event.Transfer); err != nil {
				log.Printf("Webhook: error handling transfer failed: %v", err)
			}
		}

	default:
		log.Printf("Webhook: unhandled event type: %s", event.Event)
	}

	// Sempre retornar 200 para evitar reenvios
	w.WriteHeader(http.StatusOK)
}

// generateEventID gera um ID único para o evento
func generateEventID(event asaaspkg.WebhookEvent) string {
	if event.ID != "" {
		return event.ID
	}

	// Fallback: usar tipo do evento + ID do objeto
	if event.Payment != nil {
		return event.Event + "_" + event.Payment.ID
	}
	if event.Transfer != nil {
		return event.Event + "_" + event.Transfer.ID
	}

	return event.Event + "_unknown"
}

func getPaymentID(p *asaaspkg.PaymentWebhookPayload) string {
	if p == nil {
		return "unknown"
	}
	return p.ID
}

func getTransferID(t *asaaspkg.TransferWebhookPayload) string {
	if t == nil {
		return "unknown"
	}
	return t.ID
}
