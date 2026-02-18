-- ASAAS Payment Gateway Integration
-- Tabelas para cobranças, saques e log de webhooks

-- Enum para status de cobrança ASAAS
DO $$ BEGIN
    CREATE TYPE charge_status AS ENUM (
        'PENDING',            -- Aguardando pagamento
        'CONFIRMED',          -- Pagamento confirmado
        'RECEIVED',           -- Pagamento recebido
        'OVERDUE',            -- Vencido
        'REFUNDED',           -- Estornado
        'PARTIALLY_REFUNDED', -- Parcialmente estornado
        'CANCELLED'           -- Cancelado
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipo de cobrança
DO $$ BEGIN
    CREATE TYPE billing_type AS ENUM (
        'PIX',
        'BOLETO',
        'CREDIT_CARD'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para status de saque
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM (
        'PENDING',    -- Solicitado, aguardando processamento
        'PROCESSING', -- Enviado para ASAAS
        'DONE',       -- Concluído
        'FAILED',     -- Falhou
        'CANCELLED'   -- Cancelado
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabela de cobranças (charges)
-- Rastreia cobranças ASAAS vinculadas aos pedidos
CREATE TABLE IF NOT EXISTS charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    asaas_charge_id VARCHAR(100) UNIQUE,
    asaas_customer_id VARCHAR(100),
    status charge_status NOT NULL DEFAULT 'PENDING',
    billing_type billing_type NOT NULL DEFAULT 'PIX',
    value NUMERIC(10, 2) NOT NULL,
    net_value NUMERIC(10, 2),
    invoice_url TEXT,
    bank_slip_url TEXT,
    pix_qr_code TEXT,
    pix_payload TEXT,
    pix_expiration TIMESTAMP WITH TIME ZONE,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_charge_value_positive CHECK (value > 0)
);

CREATE INDEX IF NOT EXISTS idx_charges_order_id ON charges(order_id);
CREATE INDEX IF NOT EXISTS idx_charges_asaas_charge_id ON charges(asaas_charge_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_due_date ON charges(due_date);

-- Tabela de clientes ASAAS
-- Cache local dos clientes criados no ASAAS
CREATE TABLE IF NOT EXISTS asaas_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    asaas_customer_id VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asaas_customers_user_id ON asaas_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_asaas_customers_asaas_id ON asaas_customers(asaas_customer_id);

-- Tabela de saques (payouts)
-- Rastreia transferências PIX para colaboradores
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    asaas_transfer_id VARCHAR(100) UNIQUE,
    status payout_status NOT NULL DEFAULT 'PENDING',
    value NUMERIC(10, 2) NOT NULL,
    net_value NUMERIC(10, 2),
    fee NUMERIC(10, 2) DEFAULT 0,
    pix_key VARCHAR(255) NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    description TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_payout_value_positive CHECK (value > 0),
    CONSTRAINT check_pix_key_type CHECK (pix_key_type IN ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'))
);

CREATE INDEX IF NOT EXISTS idx_payouts_collaborator_id ON payouts(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_asaas_transfer_id ON payouts(asaas_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_requested_at ON payouts(requested_at DESC);

-- Tabela de log de webhooks (idempotência)
-- Garante que cada evento ASAAS seja processado apenas uma vez
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed) WHERE processed = FALSE;

-- Adicionar campos ASAAS na tabela orders
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS asaas_charge_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(100);

-- Comentários de documentação
COMMENT ON TABLE charges IS 'Cobranças ASAAS vinculadas aos pedidos';
COMMENT ON COLUMN charges.asaas_charge_id IS 'ID da cobrança no ASAAS (ex: pay_xxx)';
COMMENT ON COLUMN charges.net_value IS 'Valor líquido após taxas ASAAS';
COMMENT ON COLUMN charges.pix_qr_code IS 'QR Code PIX em Base64';
COMMENT ON COLUMN charges.pix_payload IS 'Código PIX copia-e-cola';

COMMENT ON TABLE asaas_customers IS 'Cache de clientes ASAAS vinculados aos usuários';

COMMENT ON TABLE payouts IS 'Saques de colaboradores via ASAAS (PIX)';
COMMENT ON COLUMN payouts.asaas_transfer_id IS 'ID da transferência no ASAAS';
COMMENT ON COLUMN payouts.pix_key_type IS 'Tipo da chave PIX: CPF, CNPJ, EMAIL, PHONE, EVP';

COMMENT ON TABLE webhook_logs IS 'Log de webhooks ASAAS para idempotência';
COMMENT ON COLUMN webhook_logs.event_id IS 'ID único do evento ASAAS';
