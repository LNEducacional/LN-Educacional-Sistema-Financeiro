-- Adicionar configuracao de valor minimo de cobranca ao system_settings
INSERT INTO system_settings (key, value, description, is_secret) VALUES
    ('charge_min_amount', '5', 'Valor minimo para cobranca ASAAS (R$)', false)
ON CONFLICT (key) DO NOTHING;
