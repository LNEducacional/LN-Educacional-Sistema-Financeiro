package settings

import (
	"context"
	"errors"
	"financial-system/internal/platform/crypto"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSettingNotFound = errors.New("setting not found")
)

type Repository struct {
	db            *pgxpool.Pool
	encryptionKey []byte
}

func NewRepository(db *pgxpool.Pool, jwtSecret string) *Repository {
	return &Repository{
		db:            db,
		encryptionKey: crypto.DeriveKey(jwtSecret),
	}
}

// GetByKey busca uma configuracao por chave
func (r *Repository) GetByKey(ctx context.Context, key string) (*SystemSetting, error) {
	query := `
		SELECT id, key, value, description, is_secret, updated_at, updated_by
		FROM system_settings
		WHERE key = $1
	`

	var s SystemSetting
	err := r.db.QueryRow(ctx, query, key).Scan(
		&s.ID,
		&s.Key,
		&s.Value,
		&s.Description,
		&s.IsSecret,
		&s.UpdatedAt,
		&s.UpdatedBy,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSettingNotFound
	}
	if err != nil {
		return nil, err
	}

	// Descriptografar se for secret
	if s.IsSecret && s.Value != "" {
		decrypted, err := crypto.Decrypt(s.Value, r.encryptionKey)
		if err != nil {
			// Se falhar descriptografia, pode ser valor antigo nao criptografado
			// ou corrompido - retornar vazio para seguranca
			s.Value = ""
		} else {
			s.Value = decrypted
		}
	}

	return &s, nil
}

// GetDecryptedValue busca e retorna o valor descriptografado de uma configuracao
func (r *Repository) GetDecryptedValue(ctx context.Context, key string) (string, error) {
	setting, err := r.GetByKey(ctx, key)
	if err != nil {
		return "", err
	}
	return setting.Value, nil
}

// Update atualiza uma configuracao (criptografa se for secret)
func (r *Repository) Update(ctx context.Context, key, value, updatedBy string) error {
	// Verificar se a setting existe e se e secret
	var isSecret bool
	checkQuery := `SELECT is_secret FROM system_settings WHERE key = $1`
	err := r.db.QueryRow(ctx, checkQuery, key).Scan(&isSecret)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSettingNotFound
	}
	if err != nil {
		return err
	}

	// Criptografar se for secret
	valueToStore := value
	if isSecret && value != "" {
		encrypted, err := crypto.Encrypt(value, r.encryptionKey)
		if err != nil {
			return err
		}
		valueToStore = encrypted
	}

	// Atualizar
	query := `
		UPDATE system_settings
		SET value = $1, updated_at = $2, updated_by = $3
		WHERE key = $4
	`

	_, err = r.db.Exec(ctx, query, valueToStore, time.Now(), updatedBy, key)
	return err
}

// ListAll lista todas as configuracoes (valores mascarados)
func (r *Repository) ListAll(ctx context.Context) ([]SystemSetting, error) {
	query := `
		SELECT id, key, value, description, is_secret, updated_at, updated_by
		FROM system_settings
		ORDER BY key
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []SystemSetting
	for rows.Next() {
		var s SystemSetting
		err := rows.Scan(
			&s.ID,
			&s.Key,
			&s.Value,
			&s.Description,
			&s.IsSecret,
			&s.UpdatedAt,
			&s.UpdatedBy,
		)
		if err != nil {
			return nil, err
		}

		// Descriptografar para verificar se esta configurado
		if s.IsSecret && s.Value != "" {
			decrypted, err := crypto.Decrypt(s.Value, r.encryptionKey)
			if err != nil {
				s.Value = ""
			} else {
				s.Value = decrypted
			}
		}

		settings = append(settings, s)
	}

	return settings, nil
}

// GetAsaasConfig retorna as configuracoes do ASAAS (descriptografadas)
func (r *Repository) GetAsaasConfig(ctx context.Context) (apiKey, webhookToken string, sandbox bool, err error) {
	apiKey, err = r.GetDecryptedValue(ctx, KeyAsaasAPIKey)
	if err != nil && !errors.Is(err, ErrSettingNotFound) {
		return "", "", false, err
	}

	webhookToken, err = r.GetDecryptedValue(ctx, KeyAsaasWebhookToken)
	if err != nil && !errors.Is(err, ErrSettingNotFound) {
		return "", "", false, err
	}

	// Ler modo sandbox (default true se nao encontrado)
	sandbox = true
	sandboxVal, err := r.GetDecryptedValue(ctx, KeyAsaasSandbox)
	if err != nil && !errors.Is(err, ErrSettingNotFound) {
		return "", "", false, err
	}
	if sandboxVal == "false" {
		sandbox = false
	}

	return apiKey, webhookToken, sandbox, nil
}
