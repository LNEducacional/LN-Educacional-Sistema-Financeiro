package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// AsaasClient interface para operações com a API ASAAS
type AsaasClient interface {
	// Customers
	CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*CustomerResponse, error)
	GetCustomer(ctx context.Context, id string) (*CustomerResponse, error)
	FindCustomerByEmail(ctx context.Context, email string) (*CustomerResponse, error)

	// Payments
	CreatePayment(ctx context.Context, req CreatePaymentRequest) (*PaymentResponse, error)
	GetPayment(ctx context.Context, id string) (*PaymentResponse, error)
	GetPixQRCode(ctx context.Context, paymentID string) (*PixQRCodeResponse, error)
	RefundPayment(ctx context.Context, id string, value float64) (*RefundResponse, error)

	// Transfers (Payouts)
	CreateTransfer(ctx context.Context, req CreateTransferRequest) (*TransferResponse, error)
	GetTransfer(ctx context.Context, id string) (*TransferResponse, error)

	// Account
	GetBalance(ctx context.Context) (*BalanceResponse, error)

	// Health check
	IsConfigured() bool
}

// AsaasConfig configuração do cliente ASAAS
type AsaasConfig struct {
	APIKey       string
	APIURL       string
	Sandbox      bool
	WebhookToken string
}

// asaasClient implementação do cliente ASAAS
type asaasClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	configured bool
}

// NewAsaasClient cria um novo cliente ASAAS
func NewAsaasClient(cfg AsaasConfig) AsaasClient {
	if cfg.APIKey == "" {
		return &asaasClient{configured: false}
	}

	return &asaasClient{
		baseURL: cfg.APIURL,
		apiKey:  cfg.APIKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		configured: true,
	}
}

// IsConfigured retorna se o cliente está configurado
func (c *asaasClient) IsConfigured() bool {
	return c.configured
}

// ----- HTTP Helper Methods -----

func (c *asaasClient) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	if !c.configured {
		return nil, fmt.Errorf("ASAAS client not configured")
	}

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("access_token", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		var asaasErr AsaasError
		if err := json.Unmarshal(respBody, &asaasErr); err == nil && len(asaasErr.Errors) > 0 {
			return nil, &asaasErr
		}
		return nil, fmt.Errorf("ASAAS API error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func (c *asaasClient) get(ctx context.Context, path string, result interface{}) error {
	body, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, result)
}

func (c *asaasClient) post(ctx context.Context, path string, payload, result interface{}) error {
	body, err := c.doRequest(ctx, http.MethodPost, path, payload)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, result)
}

// ----- Customer Methods -----

// CreateCustomer cria um novo cliente no ASAAS
func (c *asaasClient) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*CustomerResponse, error) {
	var result CustomerResponse
	if err := c.post(ctx, "/customers", req, &result); err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}
	return &result, nil
}

// GetCustomer busca um cliente pelo ID
func (c *asaasClient) GetCustomer(ctx context.Context, id string) (*CustomerResponse, error) {
	var result CustomerResponse
	if err := c.get(ctx, "/customers/"+id, &result); err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}
	return &result, nil
}

// FindCustomerByEmail busca um cliente pelo email
func (c *asaasClient) FindCustomerByEmail(ctx context.Context, email string) (*CustomerResponse, error) {
	var result ListCustomersResponse
	path := fmt.Sprintf("/customers?email=%s", url.QueryEscape(email))
	if err := c.get(ctx, path, &result); err != nil {
		return nil, fmt.Errorf("find customer by email: %w", err)
	}

	if len(result.Data) == 0 {
		return nil, nil // Not found
	}

	return &result.Data[0], nil
}

// ----- Payment Methods -----

// CreatePayment cria uma nova cobrança no ASAAS
func (c *asaasClient) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*PaymentResponse, error) {
	var result PaymentResponse
	if err := c.post(ctx, "/payments", req, &result); err != nil {
		return nil, fmt.Errorf("create payment: %w", err)
	}
	return &result, nil
}

// GetPayment busca uma cobrança pelo ID
func (c *asaasClient) GetPayment(ctx context.Context, id string) (*PaymentResponse, error) {
	var result PaymentResponse
	if err := c.get(ctx, "/payments/"+id, &result); err != nil {
		return nil, fmt.Errorf("get payment: %w", err)
	}
	return &result, nil
}

// GetPixQRCode busca o QR Code PIX de uma cobrança
func (c *asaasClient) GetPixQRCode(ctx context.Context, paymentID string) (*PixQRCodeResponse, error) {
	var result PixQRCodeResponse
	path := fmt.Sprintf("/payments/%s/pixQrCode", paymentID)
	if err := c.get(ctx, path, &result); err != nil {
		return nil, fmt.Errorf("get pix qr code: %w", err)
	}
	return &result, nil
}

// RefundPayment estorna uma cobrança (total ou parcial)
func (c *asaasClient) RefundPayment(ctx context.Context, id string, value float64) (*RefundResponse, error) {
	req := RefundRequest{}
	if value > 0 {
		req.Value = value
	}

	var result RefundResponse
	path := fmt.Sprintf("/payments/%s/refund", id)
	if err := c.post(ctx, path, req, &result); err != nil {
		return nil, fmt.Errorf("refund payment: %w", err)
	}
	return &result, nil
}

// ----- Transfer Methods -----

// CreateTransfer cria uma transferência PIX para um colaborador
func (c *asaasClient) CreateTransfer(ctx context.Context, req CreateTransferRequest) (*TransferResponse, error) {
	var result TransferResponse
	if err := c.post(ctx, "/transfers", req, &result); err != nil {
		return nil, fmt.Errorf("create transfer: %w", err)
	}
	return &result, nil
}

// GetTransfer busca uma transferência pelo ID
func (c *asaasClient) GetTransfer(ctx context.Context, id string) (*TransferResponse, error) {
	var result TransferResponse
	if err := c.get(ctx, "/transfers/"+id, &result); err != nil {
		return nil, fmt.Errorf("get transfer: %w", err)
	}
	return &result, nil
}

// ----- Account Methods -----

// GetBalance busca o saldo da conta ASAAS
func (c *asaasClient) GetBalance(ctx context.Context) (*BalanceResponse, error) {
	var result BalanceResponse
	if err := c.get(ctx, "/finance/balance", &result); err != nil {
		return nil, fmt.Errorf("get balance: %w", err)
	}
	return &result, nil
}

// ----- AsaasClientManager (Hot Reload Support) -----

// AsaasClientManager gerencia o cliente ASAAS com suporte a hot reload
type AsaasClientManager struct {
	mu           sync.RWMutex
	client       *asaasClient
	webhookToken string
}

// NewAsaasClientManager cria um novo gerenciador de cliente ASAAS
func NewAsaasClientManager(cfg AsaasConfig) *AsaasClientManager {
	manager := &AsaasClientManager{}
	manager.RefreshConfig(cfg.APIKey, cfg.APIURL, cfg.WebhookToken, cfg.Sandbox)
	return manager
}

// RefreshConfig atualiza as configuracoes do cliente ASAAS (thread-safe)
func (m *AsaasClientManager) RefreshConfig(apiKey, apiURL, webhookToken string, sandbox bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if apiKey == "" {
		m.client = &asaasClient{configured: false}
		m.webhookToken = ""
		return
	}

	m.client = &asaasClient{
		baseURL: apiURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		configured: true,
	}
	m.webhookToken = webhookToken
}

// GetClient retorna o cliente atual (thread-safe)
func (m *AsaasClientManager) GetClient() AsaasClient {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.client
}

// GetWebhookToken retorna o token de webhook atual (thread-safe)
func (m *AsaasClientManager) GetWebhookToken() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.webhookToken
}

// IsConfigured verifica se o cliente esta configurado
func (m *AsaasClientManager) IsConfigured() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.client != nil && m.client.configured
}

// ----- Implementacao da interface AsaasClient no Manager -----
// O Manager delega todas as chamadas ao cliente interno

func (m *AsaasClientManager) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*CustomerResponse, error) {
	return m.GetClient().CreateCustomer(ctx, req)
}

func (m *AsaasClientManager) GetCustomer(ctx context.Context, id string) (*CustomerResponse, error) {
	return m.GetClient().GetCustomer(ctx, id)
}

func (m *AsaasClientManager) FindCustomerByEmail(ctx context.Context, email string) (*CustomerResponse, error) {
	return m.GetClient().FindCustomerByEmail(ctx, email)
}

func (m *AsaasClientManager) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*PaymentResponse, error) {
	return m.GetClient().CreatePayment(ctx, req)
}

func (m *AsaasClientManager) GetPayment(ctx context.Context, id string) (*PaymentResponse, error) {
	return m.GetClient().GetPayment(ctx, id)
}

func (m *AsaasClientManager) GetPixQRCode(ctx context.Context, paymentID string) (*PixQRCodeResponse, error) {
	return m.GetClient().GetPixQRCode(ctx, paymentID)
}

func (m *AsaasClientManager) RefundPayment(ctx context.Context, id string, value float64) (*RefundResponse, error) {
	return m.GetClient().RefundPayment(ctx, id, value)
}

func (m *AsaasClientManager) CreateTransfer(ctx context.Context, req CreateTransferRequest) (*TransferResponse, error) {
	return m.GetClient().CreateTransfer(ctx, req)
}

func (m *AsaasClientManager) GetTransfer(ctx context.Context, id string) (*TransferResponse, error) {
	return m.GetClient().GetTransfer(ctx, id)
}

func (m *AsaasClientManager) GetBalance(ctx context.Context) (*BalanceResponse, error) {
	return m.GetClient().GetBalance(ctx)
}

// TestConnection testa a conexao fazendo um GET /finance/balance real
func (m *AsaasClientManager) TestConnection(ctx context.Context) (float64, error) {
	resp, err := m.GetBalance(ctx)
	if err != nil {
		return 0, err
	}
	return resp.Balance, nil
}
