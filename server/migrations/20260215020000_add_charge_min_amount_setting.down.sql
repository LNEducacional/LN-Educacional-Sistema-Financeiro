-- Remover configuracao de valor minimo de cobranca
DELETE FROM system_settings WHERE key = 'charge_min_amount';
