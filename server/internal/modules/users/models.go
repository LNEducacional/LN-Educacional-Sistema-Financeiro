package users

import (
	"time"
)

type UserRole string

const (
	AdminRole        UserRole = "ADMIN"
	CollaboratorRole UserRole = "COLLABORATOR"
	StudentRole      UserRole = "STUDENT"
	FinanceiroRole   UserRole = "FINANCEIRO"
)

type User struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	Role           UserRole   `json:"role"`
	IsDelinquent   bool       `json:"is_delinquent"`
	DelinquentSince *time.Time `json:"delinquent_since,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}
