-- Reverter integração ASAAS

-- Remover campos ASAAS da tabela orders
ALTER TABLE orders
    DROP COLUMN IF EXISTS asaas_charge_id,
    DROP COLUMN IF EXISTS asaas_customer_id;

-- Remover tabelas
DROP TABLE IF EXISTS webhook_logs;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS asaas_customers;
DROP TABLE IF EXISTS charges;

-- Remover enums
DROP TYPE IF EXISTS payout_status;
DROP TYPE IF EXISTS billing_type;
DROP TYPE IF EXISTS charge_status;
