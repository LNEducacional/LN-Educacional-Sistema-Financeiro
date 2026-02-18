package collaborator

import (
	"financial-system/internal/modules/orders"
	"time"
)

// WalletSummary represents the wallet balance view for dashboard
type WalletSummary struct {
	Available float64 `json:"available"`
	Locked    float64 `json:"locked"`
}

// DashboardResponse is the aggregated response for collaborator dashboard
type DashboardResponse struct {
	Wallet WalletSummary                  `json:"wallet"`
	Orders []orders.CollaboratorOrderView `json:"orders"`
}

// OrderRevisionResponse represents a revision for collaborator view
type OrderRevisionResponse struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}
