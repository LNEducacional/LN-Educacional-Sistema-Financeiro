-- Rollback financial schema

DROP TRIGGER IF EXISTS trg_create_collaborator_wallet ON users;
DROP FUNCTION IF EXISTS create_wallet_for_collaborator();

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wallets;

DROP TYPE IF EXISTS tx_status;
DROP TYPE IF EXISTS tx_type;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS order_status;
