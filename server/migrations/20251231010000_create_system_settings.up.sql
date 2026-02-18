-- Tabela de configuracoes do sistema
-- Armazena configuracoes sensiveis (API keys) criptografadas com AES-256

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,  -- Criptografado com AES-256-GCM
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Inserir configuracoes iniciais do ASAAS (vazias)
INSERT INTO system_settings (key, value, description, is_secret) VALUES
    ('asaas_api_key', '', 'Chave de API do ASAAS para producao', true),
    ('asaas_webhook_token', '', 'Token de validacao de webhooks ASAAS', true)
ON CONFLICT (key) DO NOTHING;

-- Indice para busca rapida por chave
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

COMMENT ON TABLE system_settings IS 'Configuracoes do sistema armazenadas de forma segura';
COMMENT ON COLUMN system_settings.value IS 'Valor criptografado com AES-256-GCM quando is_secret=true';
COMMENT ON COLUMN system_settings.is_secret IS 'Indica se o valor deve ser criptografado e mascarado na API';
