-- Remover configuracoes de limites de saque
DELETE FROM system_settings WHERE key IN (
    'withdrawal_min_amount',
    'withdrawal_max_amount',
    'withdrawal_daily_limit'
);
