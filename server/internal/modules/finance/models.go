package finance

import "time"

type TxType string

const (
	TxTypeCredit TxType = "CREDIT"
	TxTypeDebit  TxType = "DEBIT"
)

type TxStatus string

const (
	TxStatusLocked   TxStatus = "LOCKED"
	TxStatusReleased TxStatus = "RELEASED"
	TxStatusCanceled TxStatus = "CANCELED"
)

type Wallet struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	BalanceAvailable float64   `json:"balance_available"`
	BalanceLocked    float64   `json:"balance_locked"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Transaction struct {
	ID          string    `json:"id"`
	WalletID    string    `json:"wallet_id"`
	OrderID     *string   `json:"order_id"`
	Amount      float64   `json:"amount"`
	Type        TxType    `json:"type"`
	Status      TxStatus  `json:"status"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateTransactionInput struct {
	WalletID    string
	OrderID     *string
	Amount      float64
	Type        TxType
	Status      TxStatus
	Description *string
}
