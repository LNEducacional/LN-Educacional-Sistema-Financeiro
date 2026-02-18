package notifications

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotificationNotFound = errors.New("notificação não encontrada")
)

// Repository encapsula operações de banco de dados para notificações
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository cria uma nova instância de Repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create cria uma nova notificação no banco
func (r *Repository) Create(ctx context.Context, req *CreateNotificationRequest) (*Notification, error) {
	query := `
		INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at, read_at
	`

	var notification Notification
	err := r.db.QueryRow(ctx, query,
		req.UserID,
		req.Type,
		req.Title,
		req.Message,
		req.RelatedEntityType,
		req.RelatedEntityID,
	).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.RelatedEntityType,
		&notification.RelatedEntityID,
		&notification.IsRead,
		&notification.CreatedAt,
		&notification.ReadAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create notification: %w", err)
	}

	return &notification, nil
}

// GetByID busca uma notificação por ID
func (r *Repository) GetByID(ctx context.Context, id string) (*Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at, read_at
		FROM notifications
		WHERE id = $1
	`

	var notification Notification
	err := r.db.QueryRow(ctx, query, id).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.RelatedEntityType,
		&notification.RelatedEntityID,
		&notification.IsRead,
		&notification.CreatedAt,
		&notification.ReadAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotificationNotFound
		}
		return nil, fmt.Errorf("get notification by id: %w", err)
	}

	return &notification, nil
}

// GetByFilters busca notificações aplicando filtros
func (r *Repository) GetByFilters(ctx context.Context, filters NotificationFilters) ([]*Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at, read_at
		FROM notifications
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	// Filtro obrigatório: user_id
	query += fmt.Sprintf(" AND user_id = $%d", argIndex)
	args = append(args, filters.UserID)
	argIndex++

	// Filtros opcionais
	if filters.IsRead != nil {
		query += fmt.Sprintf(" AND is_read = $%d", argIndex)
		args = append(args, *filters.IsRead)
		argIndex++
	}

	if filters.Type != nil {
		query += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, *filters.Type)
		argIndex++
	}

	if filters.RelatedEntityType != nil {
		query += fmt.Sprintf(" AND related_entity_type = $%d", argIndex)
		args = append(args, *filters.RelatedEntityType)
		argIndex++
	}

	if filters.RelatedEntityID != nil {
		query += fmt.Sprintf(" AND related_entity_id = $%d", argIndex)
		args = append(args, *filters.RelatedEntityID)
		argIndex++
	}

	// Ordenação e paginação
	query += " ORDER BY created_at DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filters.Limit)
		argIndex++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filters.Offset)
		argIndex++
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get notifications by filters: %w", err)
	}
	defer rows.Close()

	var notifications []*Notification
	for rows.Next() {
		var notification Notification
		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Type,
			&notification.Title,
			&notification.Message,
			&notification.RelatedEntityType,
			&notification.RelatedEntityID,
			&notification.IsRead,
			&notification.CreatedAt,
			&notification.ReadAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan notification: %w", err)
		}
		notifications = append(notifications, &notification)
	}

	return notifications, nil
}

// MarkAsRead marca notificações como lidas
func (r *Repository) MarkAsRead(ctx context.Context, notificationIDs []string) error {
	if len(notificationIDs) == 0 {
		return nil
	}

	// Construir placeholders dinâmicos: $1, $2, $3, ...
	placeholders := make([]string, len(notificationIDs))
	args := make([]interface{}, len(notificationIDs))
	for i, id := range notificationIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		UPDATE notifications
		SET is_read = TRUE, read_at = $%d
		WHERE id IN (%s) AND is_read = FALSE
	`, len(args)+1, strings.Join(placeholders, ", "))

	args = append(args, time.Now())

	_, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("mark notifications as read: %w", err)
	}

	return nil
}

// MarkAllAsRead marca todas as notificações de um usuário como lidas
func (r *Repository) MarkAllAsRead(ctx context.Context, userID string) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE, read_at = $1
		WHERE user_id = $2 AND is_read = FALSE
	`

	_, err := r.db.Exec(ctx, query, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("mark all notifications as read: %w", err)
	}

	return nil
}

// GetStats retorna estatísticas de notificações do usuário
func (r *Repository) GetStats(ctx context.Context, userID string) (*NotificationStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
			COUNT(*) as total_count
		FROM notifications
		WHERE user_id = $1
	`

	var stats NotificationStats
	err := r.db.QueryRow(ctx, query, userID).Scan(&stats.UnreadCount, &stats.TotalCount)
	if err != nil {
		return nil, fmt.Errorf("get notification stats: %w", err)
	}

	return &stats, nil
}

// DeleteOldRead remove notificações lidas com mais de X dias
func (r *Repository) DeleteOldRead(ctx context.Context, daysOld int) error {
	query := `
		DELETE FROM notifications
		WHERE is_read = TRUE AND read_at < $1
	`

	cutoffDate := time.Now().AddDate(0, 0, -daysOld)
	_, err := r.db.Exec(ctx, query, cutoffDate)
	if err != nil {
		return fmt.Errorf("delete old read notifications: %w", err)
	}

	return nil
}
