-- Adicionar configuracoes de limites de saque ao system_settings
INSERT INTO system_settings (key, value, description, is_secret) VALUES
    ('withdrawal_min_amount', '50', 'Valor minimo por saque (R$)', false),
    ('withdrawal_max_amount', '10000', 'Valor maximo por saque (R$)', false),
    ('withdrawal_daily_limit', '50000', 'Limite diario de saque (R$)', false)
ON CONFLICT (key) DO NOTHING;
