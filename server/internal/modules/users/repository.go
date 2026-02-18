package users

import (
	"context"
	"errors"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, user *User) error {
	query := "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, created_at"
	err := r.db.QueryRow(ctx, query, user.Name, user.Email, user.PasswordHash, user.Role).Scan(&user.ID, &user.CreatedAt)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		return err
	}
	return nil
}

func (r *Repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := "SELECT id, name, email, password_hash, role, is_delinquent, delinquent_since, created_at FROM users WHERE email = $1"
	user := &User{}
	err := r.db.QueryRow(ctx, query, email).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.IsDelinquent, &user.DelinquentSince, &user.CreatedAt)
	if err != nil {
		log.Printf("Error getting user by email: %v", err)
		return nil, err
	}
	return user, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*User, error) {
	query := "SELECT id, name, email, password_hash, role, is_delinquent, delinquent_since, created_at FROM users WHERE id = $1"
	user := &User{}
	err := r.db.QueryRow(ctx, query, id).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.IsDelinquent, &user.DelinquentSince, &user.CreatedAt)
	if err != nil {
		log.Printf("Error getting user by id: %v", err)
		return nil, err
	}
	return user, nil
}

// UpdatePassword updates the user's password hash
func (r *Repository) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	query := "UPDATE users SET password_hash = $1 WHERE id = $2"
	result, err := r.db.Exec(ctx, query, passwordHash, userID)
	if err != nil {
		log.Printf("Error updating user password: %v", err)
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}
