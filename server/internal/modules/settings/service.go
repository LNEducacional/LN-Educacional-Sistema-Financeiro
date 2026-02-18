package settings

import (
	"context"
	"errors"
	"financial-system/internal/platform/crypto"
	"fmt"
	"strconv"
)

// AsaasClientRefresher interface para atualizar e testar o cliente ASAAS
type AsaasClientRefresher interface {
	RefreshConfig(apiKey, apiURL, webhookToken string, sandbox bool)
	IsConfigured() bool
	TestConnection(ctx context.Context) (balance float64, err error)
}

type Service struct {
	repo          *Repository
	asaasRefresh  AsaasClientRefresher
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// SetAsaasRefresher configura o refresher do cliente ASAAS (para hot reload)
func (s *Service) SetAsaasRefresher(refresher AsaasClientRefresher) {
	s.asaasRefresh = refresher
}

// GetAsaasSettings retorna as configuracoes ASAAS com valores mascarados
func (s *Service) GetAsaasSettings(ctx context.Context) (*AsaasSettingsResponse, error) {
	settings, err := s.repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	// Default sandbox = true
	sandbox := true

	response := &AsaasSettingsResponse{}

	for _, setting := range settings {
		sr := SettingResponse{
			Key:          setting.Key,
			Description:  setting.Description,
			IsSecret:     setting.IsSecret,
			IsConfigured: crypto.IsConfigured(setting.Value),
			UpdatedAt:    setting.UpdatedAt,
		}

		// Mascarar valor se for secret
		if setting.IsSecret {
			sr.Value = crypto.MaskSecret(setting.Value)
		} else {
			sr.Value = setting.Value
		}

		switch setting.Key {
		case KeyAsaasAPIKey:
			response.APIKey = sr
		case KeyAsaasWebhookToken:
			response.WebhookToken = sr
		case KeyAsaasSandbox:
			if setting.Value == "false" {
				sandbox = false
			}
		}
	}

	response.Sandbox = sandbox
	response.APIURL = AsaasURLForMode(sandbox)

	// Sistema esta configurado se ambos estao preenchidos
	response.IsConfigured = response.APIKey.IsConfigured && response.WebhookToken.IsConfigured

	return response, nil
}

// UpdateSetting atualiza uma configuracao e recarrega o cliente ASAAS se necessario
func (s *Service) UpdateSetting(ctx context.Context, key, value, updatedBy string) error {
	// Validar chave permitida
	allowedKeys := map[string]bool{
		KeyAsaasAPIKey:          true,
		KeyAsaasWebhookToken:    true,
		KeyAsaasSandbox:         true,
		KeyWithdrawalMinAmount:  true,
		KeyWithdrawalMaxAmount:  true,
		KeyWithdrawalDailyLimit: true,
		KeyChargeMinAmount:      true,
	}
	if !allowedKeys[key] {
		return fmt.Errorf("chave de configuracao invalida: %s", key)
	}

	// Validar valor booleano para sandbox
	if key == KeyAsaasSandbox {
		if value != "true" && value != "false" {
			return fmt.Errorf("valor de asaas_sandbox deve ser 'true' ou 'false'")
		}
	}

	// Validar valores numericos para limites de saque e cobranca
	if key == KeyWithdrawalMinAmount || key == KeyWithdrawalMaxAmount || key == KeyWithdrawalDailyLimit || key == KeyChargeMinAmount {
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil || parsed <= 0 {
			return fmt.Errorf("valor deve ser um numero positivo")
		}
	}

	// Atualizar no banco
	if err := s.repo.Update(ctx, key, value, updatedBy); err != nil {
		return err
	}

	// Hot reload do cliente ASAAS (para chaves ASAAS incluindo sandbox)
	if key == KeyAsaasAPIKey || key == KeyAsaasWebhookToken || key == KeyAsaasSandbox {
		return s.refreshAsaasClient(ctx)
	}

	return nil
}

// refreshAsaasClient recarrega o cliente ASAAS com as novas configuracoes
func (s *Service) refreshAsaasClient(ctx context.Context) error {
	if s.asaasRefresh == nil {
		return nil // Sem refresher configurado
	}

	apiKey, webhookToken, sandbox, err := s.repo.GetAsaasConfig(ctx)
	if err != nil {
		return err
	}

	s.asaasRefresh.RefreshConfig(apiKey, AsaasURLForMode(sandbox), webhookToken, sandbox)
	return nil
}

// TestAsaasConnection testa a conexao com a API do ASAAS fazendo uma chamada real
func (s *Service) TestAsaasConnection(ctx context.Context) (*TestAsaasResponse, error) {
	apiKey, _, _, err := s.repo.GetAsaasConfig(ctx)
	if err != nil {
		return &TestAsaasResponse{
			Success: false,
			Message: "Erro ao obter configuracoes: " + err.Error(),
		}, nil
	}

	if apiKey == "" {
		return &TestAsaasResponse{
			Success: false,
			Message: "API Key nao configurada",
		}, nil
	}

	if s.asaasRefresh == nil || !s.asaasRefresh.IsConfigured() {
		return &TestAsaasResponse{
			Success: false,
			Message: "Cliente ASAAS nao inicializado",
		}, nil
	}

	// Chamada real à API do ASAAS (GET /finance/balance)
	balance, err := s.asaasRefresh.TestConnection(ctx)
	if err != nil {
		return &TestAsaasResponse{
			Success: false,
			Message: "Falha na conexao: " + err.Error(),
		}, nil
	}

	balanceStr := fmt.Sprintf("%.2f", balance)
	return &TestAsaasResponse{
		Success: true,
		Message: "Conexao com ASAAS verificada com sucesso",
		Balance: &balanceStr,
	}, nil
}

// LoadAndApplySettings carrega as configuracoes do banco e aplica ao cliente ASAAS
// Chamado na inicializacao do servidor
func (s *Service) LoadAndApplySettings(ctx context.Context) error {
	return s.refreshAsaasClient(ctx)
}

// GetAsaasConfig retorna as configuracoes descriptografadas do ASAAS
// Usado internamente para inicializar o cliente
func (s *Service) GetAsaasConfig(ctx context.Context) (apiKey, webhookToken string, sandbox bool, err error) {
	return s.repo.GetAsaasConfig(ctx)
}

// GetWithdrawalLimits retorna os limites de saque e cobranca configurados (com defaults)
func (s *Service) GetWithdrawalLimits(ctx context.Context) (*WithdrawalLimitsResponse, error) {
	defaults := &WithdrawalLimitsResponse{
		MinAmount:       50.0,
		MaxAmount:       10000.0,
		DailyLimit:      50000.0,
		ChargeMinAmount: 5.0,
	}

	readFloat := func(key string) (float64, error) {
		setting, err := s.repo.GetByKey(ctx, key)
		if err != nil {
			if errors.Is(err, ErrSettingNotFound) {
				return 0, ErrSettingNotFound
			}
			return 0, err
		}
		return strconv.ParseFloat(setting.Value, 64)
	}

	if v, err := readFloat(KeyWithdrawalMinAmount); err == nil {
		defaults.MinAmount = v
	}
	if v, err := readFloat(KeyWithdrawalMaxAmount); err == nil {
		defaults.MaxAmount = v
	}
	if v, err := readFloat(KeyWithdrawalDailyLimit); err == nil {
		defaults.DailyLimit = v
	}
	if v, err := readFloat(KeyChargeMinAmount); err == nil {
		defaults.ChargeMinAmount = v
	}

	return defaults, nil
}

// GetChargeMinAmount retorna o valor minimo de cobranca configurado (default: 5.0)
func (s *Service) GetChargeMinAmount(ctx context.Context) (float64, error) {
	setting, err := s.repo.GetByKey(ctx, KeyChargeMinAmount)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return 5.0, nil
		}
		return 0, err
	}
	v, err := strconv.ParseFloat(setting.Value, 64)
	if err != nil {
		return 5.0, nil
	}
	return v, nil
}
