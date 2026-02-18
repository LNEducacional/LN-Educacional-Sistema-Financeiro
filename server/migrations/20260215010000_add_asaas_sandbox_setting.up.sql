INSERT INTO system_settings (id, key, value, description, is_secret, updated_at)
VALUES (
    gen_random_uuid(),
    'asaas_sandbox',
    'true',
    'Modo sandbox do ASAAS (true = sandbox, false = producao)',
    false,
    NOW()
)
ON CONFLICT (key) DO NOTHING;
