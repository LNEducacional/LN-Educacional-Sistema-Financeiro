package collaborator

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"financial-system/internal/modules/finance"
	"financial-system/internal/modules/orders"
	"financial-system/internal/platform/middleware"
	"financial-system/internal/platform/storage"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrderNotOwned        = errors.New("order does not belong to this collaborator")
	ErrInvalidDeliveryStatus = errors.New("cannot deliver order with current status")
)

type Handler struct {
	db          *pgxpool.Pool
	financeRepo *finance.Repository
	orderRepo   *orders.Repository
}

func NewHandler(db *pgxpool.Pool, financeRepo *finance.Repository, orderRepo *orders.Repository) *Handler {
	return &Handler{
		db:          db,
		financeRepo: financeRepo,
		orderRepo:   orderRepo,
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/dashboard", h.handleDashboard)
	r.Post("/orders/{id}/deliver", h.handleDeliver)
	r.Get("/orders/{id}/revisions", h.handleGetOrderRevisions)
}

// handleDashboard returns wallet summary and orders for the logged-in collaborator
func (h *Handler) handleDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value(middleware.UserIDKey).(string)

	// Get wallet
	wallet, err := h.financeRepo.GetWalletByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, finance.ErrWalletNotFound) {
			// No wallet yet - return zero balances
			wallet = &finance.Wallet{
				BalanceAvailable: 0,
				BalanceLocked:    0,
			}
		} else {
			http.Error(w, "failed to get wallet", http.StatusInternalServerError)
			return
		}
	}

	// Get orders with details (only collab_value exposed as my_share)
	orderList, err := h.orderRepo.ListByCollaboratorWithDetails(ctx, userID)
	if err != nil {
		http.Error(w, "failed to get orders", http.StatusInternalServerError)
		return
	}

	// Ensure non-nil slice
	if orderList == nil {
		orderList = []orders.CollaboratorOrderView{}
	}

	response := DashboardResponse{
		Wallet: WalletSummary{
			Available: wallet.BalanceAvailable,
			Locked:    wallet.BalanceLocked,
		},
		Orders: orderList,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleDeliver processes file upload and marks order as delivered
func (h *Handler) handleDeliver(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value(middleware.UserIDKey).(string)
	orderID := chi.URLParam(r, "id")

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "file too large or invalid form", http.StatusBadRequest)
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate order belongs to collaborator and status allows delivery
	order, err := h.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, orders.ErrOrderNotFound) {
			http.Error(w, "order not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get order", http.StatusInternalServerError)
		return
	}

	if order.CollaboratorID != userID {
		http.Error(w, ErrOrderNotOwned.Error(), http.StatusForbidden)
		return
	}

	// Only allow delivery for NOVO, EM_ANDAMENTO, ATRASADO statuses
	allowedStatuses := map[orders.OrderStatus]bool{
		orders.OrderStatusNovo:        true,
		orders.OrderStatusEmAndamento: true,
		orders.OrderStatusAtrasado:    true,
	}
	if !allowedStatuses[order.Status] {
		http.Error(w, ErrInvalidDeliveryStatus.Error(), http.StatusBadRequest)
		return
	}

	// Save file using storage helper
	fileInfo, err := storage.SaveFile(file, header)
	if err != nil {
		if errors.Is(err, storage.ErrInvalidMimeType) {
			http.Error(w, "invalid file type. Allowed: PDF, DOCX, ZIP", http.StatusBadRequest)
			return
		}
		if errors.Is(err, storage.ErrFileTooLarge) {
			http.Error(w, "file exceeds maximum size of 10MB", http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	// Begin transaction
	tx, err := h.db.Begin(ctx)
	if err != nil {
		http.Error(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// Create delivery record
	delivery, err := h.orderRepo.CreateDeliveryTx(ctx, tx, orders.CreateDeliveryInput{
		OrderID:      orderID,
		FilePath:     fileInfo.Path,
		OriginalName: fileInfo.OriginalName,
		MimeType:     fileInfo.MimeType,
		FileSize:     fileInfo.Size,
	})
	if err != nil {
		http.Error(w, "failed to create delivery record", http.StatusInternalServerError)
		return
	}

	// Update order status to ENTREGUE
	err = h.orderRepo.UpdateStatusTx(ctx, tx, orderID, orders.OrderStatusEntregue)
	if err != nil {
		http.Error(w, "failed to update order status", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Log notification stub (future: send email to student)
	log.Printf("NOTIFICATION STUB: Order %s delivered. Student should be notified.", orderID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(delivery)
}

// handleGetOrderRevisions returns revision history for an order belonging to the collaborator
func (h *Handler) handleGetOrderRevisions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value(middleware.UserIDKey).(string)
	orderID := chi.URLParam(r, "id")

	// Validate order belongs to collaborator
	order, err := h.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, orders.ErrOrderNotFound) {
			http.Error(w, "order not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get order", http.StatusInternalServerError)
		return
	}

	if order.CollaboratorID != userID {
		http.Error(w, ErrOrderNotOwned.Error(), http.StatusForbidden)
		return
	}

	// Get revisions for this order
	revisions, err := h.orderRepo.GetRevisionsByOrderID(ctx, orderID)
	if err != nil {
		http.Error(w, "failed to get revisions", http.StatusInternalServerError)
		return
	}

	// Ensure non-nil slice
	if revisions == nil {
		revisions = []orders.OrderRevision{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(revisions)
}
