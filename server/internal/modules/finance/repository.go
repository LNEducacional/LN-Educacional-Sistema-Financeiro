package finance

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrWalletNotFound      = errors.New("wallet not found")
	ErrInsufficientBalance = errors.New("insufficient balance")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetWalletByUserID retrieves wallet by user ID
func (r *Repository) GetWalletByUserID(ctx context.Context, userID string) (*Wallet, error) {
	query := `
		SELECT id, user_id, balance_available, balance_locked, created_at, updated_at
		FROM wallets
		WHERE user_id = $1
	`
	var w Wallet
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.BalanceAvailable, &w.BalanceLocked,
		&w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWalletNotFound
		}
		return nil, err
	}
	return &w, nil
}

// GetWalletByUserIDTx retrieves wallet within a transaction
func (r *Repository) GetWalletByUserIDTx(ctx context.Context, tx pgx.Tx, userID string) (*Wallet, error) {
	query := `
		SELECT id, user_id, balance_available, balance_locked, created_at, updated_at
		FROM wallets
		WHERE user_id = $1
		FOR UPDATE
	`
	var w Wallet
	err := tx.QueryRow(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.BalanceAvailable, &w.BalanceLocked,
		&w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWalletNotFound
		}
		return nil, err
	}
	return &w, nil
}

// CreditLocked adds amount to balance_locked (atomic increment)
func (r *Repository) CreditLocked(ctx context.Context, tx pgx.Tx, userID string, amount float64) error {
	query := `
		UPDATE wallets
		SET balance_locked = balance_locked + $2, updated_at = NOW()
		WHERE user_id = $1
	`
	result, err := tx.Exec(ctx, query, userID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrWalletNotFound
	}
	return nil
}

// DebitLocked removes amount from balance_locked (atomic decrement)
func (r *Repository) DebitLocked(ctx context.Context, tx pgx.Tx, userID string, amount float64) error {
	query := `
		UPDATE wallets
		SET balance_locked = balance_locked - $2, updated_at = NOW()
		WHERE user_id = $1 AND balance_locked >= $2
	`
	result, err := tx.Exec(ctx, query, userID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientBalance
	}
	return nil
}

// ReleaseLocked moves amount from balance_locked to balance_available
func (r *Repository) ReleaseLocked(ctx context.Context, tx pgx.Tx, userID string, amount float64) error {
	query := `
		UPDATE wallets
		SET balance_locked = balance_locked - $2,
		    balance_available = balance_available + $2,
		    updated_at = NOW()
		WHERE user_id = $1 AND balance_locked >= $2
	`
	result, err := tx.Exec(ctx, query, userID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientBalance
	}
	return nil
}

// CreateTransaction inserts a new transaction record (ledger entry)
func (r *Repository) CreateTransaction(ctx context.Context, tx pgx.Tx, input CreateTransactionInput) (*Transaction, error) {
	query := `
		INSERT INTO transactions (wallet_id, order_id, amount, type, status, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, wallet_id, order_id, amount, type, status, description, created_at
	`
	var t Transaction
	err := tx.QueryRow(ctx, query,
		input.WalletID,
		input.OrderID,
		input.Amount,
		input.Type,
		input.Status,
		input.Description,
	).Scan(
		&t.ID, &t.WalletID, &t.OrderID, &t.Amount, &t.Type, &t.Status, &t.Description, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetTransactionsByWalletID retrieves all transactions for a wallet
func (r *Repository) GetTransactionsByWalletID(ctx context.Context, walletID string) ([]Transaction, error) {
	query := `
		SELECT id, wallet_id, order_id, amount, type, status, description, created_at
		FROM transactions
		WHERE wallet_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		err := rows.Scan(
			&t.ID, &t.WalletID, &t.OrderID, &t.Amount, &t.Type, &t.Status, &t.Description, &t.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, t)
	}
	return transactions, nil
}

// UpdateTransactionStatus updates a transaction status (only for releasing/canceling)
func (r *Repository) UpdateTransactionStatus(ctx context.Context, tx pgx.Tx, transactionID string, status TxStatus) error {
	query := `
		UPDATE transactions
		SET status = $2
		WHERE id = $1
	`
	result, err := tx.Exec(ctx, query, transactionID, status)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("transaction not found")
	}
	return nil
}

// CreateWalletForUser creates a wallet for a user (used in user registration)
func (r *Repository) CreateWalletForUser(ctx context.Context, userID string) (*Wallet, error) {
	query := `
		INSERT INTO wallets (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO NOTHING
		RETURNING id, user_id, balance_available, balance_locked, created_at, updated_at
	`
	var w Wallet
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.BalanceAvailable, &w.BalanceLocked, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return r.GetWalletByUserID(ctx, userID)
		}
		return nil, err
	}
	return &w, nil
}

// DebitBalance removes amount from balance_available (for withdrawals)
func (r *Repository) DebitBalance(ctx context.Context, walletID string, amount float64) error {
	query := `
		UPDATE wallets
		SET balance_available = balance_available - $2, updated_at = NOW()
		WHERE id = $1 AND balance_available >= $2
	`
	result, err := r.db.Exec(ctx, query, walletID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientBalance
	}
	return nil
}

// CreditBalance adds amount to balance_available (for refunds or failed withdrawals)
func (r *Repository) CreditBalance(ctx context.Context, walletID string, amount float64) error {
	query := `
		UPDATE wallets
		SET balance_available = balance_available + $2, updated_at = NOW()
		WHERE id = $1
	`
	result, err := r.db.Exec(ctx, query, walletID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrWalletNotFound
	}
	return nil
}
