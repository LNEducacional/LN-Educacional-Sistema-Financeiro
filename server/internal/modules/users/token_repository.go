package users

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrTokenNotFound = errors.New("refresh token not found")
	ErrTokenRevoked  = errors.New("refresh token has been revoked")
	ErrTokenExpired  = errors.New("refresh token has expired")
	ErrTokenReused   = errors.New("refresh token has already been used")
)

type TokenRepository struct {
	db *pgxpool.Pool
}

func NewTokenRepository(db *pgxpool.Pool) *TokenRepository {
	return &TokenRepository{db: db}
}

func (r *TokenRepository) Create(ctx context.Context, token *RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query, token.UserID, token.TokenHash, token.FamilyID, token.ExpiresAt).
		Scan(&token.ID, &token.CreatedAt)
}

func (r *TokenRepository) GetByHash(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, family_id, expires_at, revoked_at, created_at, replaced_by
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	token := &RefreshToken{}
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.FamilyID,
		&token.ExpiresAt, &token.RevokedAt, &token.CreatedAt, &token.ReplacedBy,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	return token, nil
}

func (r *TokenRepository) Revoke(ctx context.Context, tokenID string) error {
	query := `UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now(), tokenID)
	return err
}

func (r *TokenRepository) RevokeFamily(ctx context.Context, familyID string) error {
	query := `UPDATE refresh_tokens SET revoked_at = $1 WHERE family_id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now(), familyID)
	return err
}

func (r *TokenRepository) RevokeAllForUser(ctx context.Context, userID string) error {
	query := `UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now(), userID)
	return err
}

func (r *TokenRepository) MarkReplaced(ctx context.Context, oldTokenID, newTokenID string) error {
	query := `UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, newTokenID, oldTokenID)
	return err
}

func (r *TokenRepository) DeleteExpired(ctx context.Context) (int64, error) {
	query := `DELETE FROM refresh_tokens WHERE expires_at < $1`
	result, err := r.db.Exec(ctx, query, time.Now())
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// Password Reset Token Methods

// CreatePasswordResetToken creates a new password reset token
func (r *TokenRepository) CreatePasswordResetToken(ctx context.Context, token *PasswordResetToken) error {
	query := `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query, token.UserID, token.TokenHash, token.ExpiresAt).
		Scan(&token.ID, &token.CreatedAt)
}

// GetPasswordResetTokenByHash retrieves a password reset token by its hash
func (r *TokenRepository) GetPasswordResetTokenByHash(ctx context.Context, tokenHash string) (*PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`
	token := &PasswordResetToken{}
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash,
		&token.ExpiresAt, &token.UsedAt, &token.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	return token, nil
}

// MarkPasswordResetTokenUsed marks a password reset token as used
func (r *TokenRepository) MarkPasswordResetTokenUsed(ctx context.Context, tokenID string) error {
	query := `UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, time.Now(), tokenID)
	return err
}

// InvalidatePreviousPasswordResetTokens marks all previous tokens for a user as used
func (r *TokenRepository) InvalidatePreviousPasswordResetTokens(ctx context.Context, userID string) error {
	query := `UPDATE password_reset_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now(), userID)
	return err
}

// DeleteExpiredPasswordResetTokens removes expired password reset tokens
func (r *TokenRepository) DeleteExpiredPasswordResetTokens(ctx context.Context) (int64, error) {
	query := `DELETE FROM password_reset_tokens WHERE expires_at < $1`
	result, err := r.db.Exec(ctx, query, time.Now())
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
