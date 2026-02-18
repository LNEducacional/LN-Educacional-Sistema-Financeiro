package users

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"financial-system/internal/platform/email"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserNotFound            = errors.New("user not found")
	ErrInvalidCredentials      = errors.New("invalid credentials")
	ErrPasswordResetTokenUsed  = errors.New("password reset token has already been used")
	ErrPasswordResetExpired    = errors.New("password reset token has expired")
	ErrEmailServiceUnavailable = errors.New("email service unavailable")
)

type Service struct {
	repo            *Repository
	tokenRepo       *TokenRepository
	jwtSecret       []byte
	accessDuration  time.Duration
	refreshDuration time.Duration
	emailService    *email.Service
	appBaseURL      string
}

func NewService(repo *Repository, tokenRepo *TokenRepository, jwtSecret string, accessDuration, refreshDuration time.Duration) *Service {
	return &Service{
		repo:            repo,
		tokenRepo:       tokenRepo,
		jwtSecret:       []byte(jwtSecret),
		accessDuration:  accessDuration,
		refreshDuration: refreshDuration,
	}
}

// SetEmailService configures the email service for password reset functionality
func (s *Service) SetEmailService(emailService *email.Service, appBaseURL string) {
	s.emailService = emailService
	s.appBaseURL = appBaseURL
}

type RegisterRequest struct {
	Name     string   `json:"name"`
	Email    string   `json:"email"`
	Password string   `json:"password"`
	Role     UserRole `json:"role"`
}

func (s *Service) Register(ctx context.Context, req *RegisterRequest) (*User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
	}

	err = s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Service) Login(ctx context.Context, req *LoginRequest) (*TokenPair, error) {
	user, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrUserNotFound
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.generateTokenPair(ctx, user, nil)
}

func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*TokenPair, error) {
	tokenHash := hashToken(refreshToken)

	storedToken, err := s.tokenRepo.GetByHash(ctx, tokenHash)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if storedToken.RevokedAt != nil {
		return nil, ErrTokenRevoked
	}

	if time.Now().After(storedToken.ExpiresAt) {
		return nil, ErrTokenExpired
	}

	if storedToken.ReplacedBy != nil {
		_ = s.tokenRepo.RevokeFamily(ctx, storedToken.FamilyID)
		return nil, ErrTokenReused
	}

	user, err := s.repo.GetByID(ctx, storedToken.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	familyID := storedToken.FamilyID
	tokenPair, err := s.generateTokenPair(ctx, user, &familyID)
	if err != nil {
		return nil, err
	}

	newTokenHash := hashToken(tokenPair.RefreshToken)
	newStoredToken, err := s.tokenRepo.GetByHash(ctx, newTokenHash)
	if err == nil {
		_ = s.tokenRepo.MarkReplaced(ctx, storedToken.ID, newStoredToken.ID)
	}

	return tokenPair, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := hashToken(refreshToken)

	storedToken, err := s.tokenRepo.GetByHash(ctx, tokenHash)
	if err != nil {
		return nil
	}

	return s.tokenRepo.Revoke(ctx, storedToken.ID)
}

func (s *Service) LogoutAll(ctx context.Context, userID string) error {
	return s.tokenRepo.RevokeAllForUser(ctx, userID)
}

func (s *Service) generateTokenPair(ctx context.Context, user *User, familyID *string) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(s.accessDuration)

	claims := jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"iat":  now.Unix(),
		"exp":  accessExpiry.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateSecureToken()
	if err != nil {
		return nil, err
	}

	var fID string
	if familyID != nil {
		fID = *familyID
	} else {
		fID = uuid.New().String()
	}

	storedToken := &RefreshToken{
		UserID:    user.ID,
		TokenHash: hashToken(refreshToken),
		FamilyID:  fID,
		ExpiresAt: now.Add(s.refreshDuration),
	}

	err = s.tokenRepo.Create(ctx, storedToken)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.accessDuration.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// RequestPasswordReset initiates the password reset flow
// Returns nil even if user doesn't exist (security: don't reveal user existence)
func (s *Service) RequestPasswordReset(ctx context.Context, email string) error {
	if s.emailService == nil || !s.emailService.IsConfigured() {
		return ErrEmailServiceUnavailable
	}

	// Try to find user by email
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if user exists or not - just return success
		return nil
	}

	// Invalidate any previous reset tokens for this user
	_ = s.tokenRepo.InvalidatePreviousPasswordResetTokens(ctx, user.ID)

	// Generate secure token
	token, err := generateSecureToken()
	if err != nil {
		return err
	}

	// Store hashed token (never store plain token)
	resetToken := &PasswordResetToken{
		UserID:    user.ID,
		TokenHash: hashToken(token),
		ExpiresAt: time.Now().Add(15 * time.Minute), // 15 minutes expiry
	}

	err = s.tokenRepo.CreatePasswordResetToken(ctx, resetToken)
	if err != nil {
		return err
	}

	// Send email with plain token (user will use this)
	err = s.emailService.SendPasswordResetEmail(user.Email, user.Name, token, s.appBaseURL)
	if err != nil {
		// If email fails, mark token as used to prevent orphaned tokens
		_ = s.tokenRepo.MarkPasswordResetTokenUsed(ctx, resetToken.ID)
		return err
	}

	return nil
}

// ValidatePasswordResetToken checks if a token is valid
func (s *Service) ValidatePasswordResetToken(ctx context.Context, token string) error {
	tokenHash := hashToken(token)

	storedToken, err := s.tokenRepo.GetPasswordResetTokenByHash(ctx, tokenHash)
	if err != nil {
		return ErrInvalidCredentials
	}

	if storedToken.UsedAt != nil {
		return ErrPasswordResetTokenUsed
	}

	if time.Now().After(storedToken.ExpiresAt) {
		return ErrPasswordResetExpired
	}

	return nil
}

// ResetPassword resets the user's password using a valid token
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	tokenHash := hashToken(token)

	storedToken, err := s.tokenRepo.GetPasswordResetTokenByHash(ctx, tokenHash)
	if err != nil {
		return ErrInvalidCredentials
	}

	if storedToken.UsedAt != nil {
		return ErrPasswordResetTokenUsed
	}

	if time.Now().After(storedToken.ExpiresAt) {
		return ErrPasswordResetExpired
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user's password
	err = s.repo.UpdatePassword(ctx, storedToken.UserID, string(hashedPassword))
	if err != nil {
		return err
	}

	// Mark token as used
	err = s.tokenRepo.MarkPasswordResetTokenUsed(ctx, storedToken.ID)
	if err != nil {
		return err
	}

	// Invalidate all refresh tokens for security (force re-login)
	_ = s.tokenRepo.RevokeAllForUser(ctx, storedToken.UserID)

	return nil
}
