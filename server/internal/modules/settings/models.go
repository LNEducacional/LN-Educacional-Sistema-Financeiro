package settings

import "time"

// Constantes para chaves de configuracao
const (
	KeyAsaasAPIKey       = "asaas_api_key"
	KeyAsaasWebhookToken = "asaas_webhook_token"
	KeyAsaasSandbox      = "asaas_sandbox"

	// Limites de saque
	KeyWithdrawalMinAmount  = "withdrawal_min_amount"
	KeyWithdrawalMaxAmount  = "withdrawal_max_amount"
	KeyWithdrawalDailyLimit = "withdrawal_daily_limit"

	// Valor minimo de cobranca (ASAAS exige >= R$ 5,00)
	KeyChargeMinAmount = "charge_min_amount"
)

// URLs fixas do ASAAS por ambiente
const (
	AsaasSandboxURL    = "https://sandbox.asaas.com/api/v3"
	AsaasProductionURL = "https://api.asaas.com/v3"
)

// AsaasURLForMode retorna a URL da API ASAAS com base no modo sandbox
func AsaasURLForMode(sandbox bool) string {
	if sandbox {
		return AsaasSandboxURL
	}
	return AsaasProductionURL
}

// SystemSetting representa uma configuracao do sistema
type SystemSetting struct {
	ID          string     `json:"id"`
	Key         string     `json:"key"`
	Value       string     `json:"value"` // Pode estar criptografado
	Description *string    `json:"description,omitempty"`
	IsSecret    bool       `json:"is_secret"`
	UpdatedAt   time.Time  `json:"updated_at"`
	UpdatedBy   *string    `json:"updated_by,omitempty"`
}

// SettingResponse representa a resposta da API (valor mascarado para secrets)
type SettingResponse struct {
	Key          string     `json:"key"`
	Value        string     `json:"value"` // Mascarado se is_secret
	Description  *string    `json:"description,omitempty"`
	IsSecret     bool       `json:"is_secret"`
	IsConfigured bool       `json:"is_configured"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// AsaasSettingsResponse resposta especifica para configuracoes ASAAS
type AsaasSettingsResponse struct {
	APIKey       SettingResponse `json:"api_key"`
	WebhookToken SettingResponse `json:"webhook_token"`
	IsConfigured bool            `json:"is_configured"` // true se ambos estao configurados
	APIURL       string          `json:"api_url"`       // Derivada do modo sandbox/producao
	Sandbox      bool            `json:"sandbox"`       // true = sandbox, false = producao
}

// UpdateSettingRequest request para atualizar uma configuracao
type UpdateSettingRequest struct {
	Value string `json:"value"`
}

// WithdrawalLimitsResponse resposta com os limites de saque e cobranca configurados
type WithdrawalLimitsResponse struct {
	MinAmount      float64 `json:"min_amount"`
	MaxAmount      float64 `json:"max_amount"`
	DailyLimit     float64 `json:"daily_limit"`
	ChargeMinAmount float64 `json:"charge_min_amount"`
}

// TestAsaasResponse resposta do teste de conexao ASAAS
type TestAsaasResponse struct {
	Success bool    `json:"success"`
	Message string  `json:"message"`
	Balance *string `json:"balance,omitempty"` // Saldo da conta se sucesso
}
