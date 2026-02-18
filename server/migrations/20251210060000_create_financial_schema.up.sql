-- Financial Schema: Wallets, Orders, Transactions
-- Implements Escrow logic with balance locking

-- Enums for order and transaction states
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('NOVO', 'EM_ANDAMENTO', 'ENTREGUE', 'CONCLUIDO', 'ATRASADO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('LOCKED', 'RELEASED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('LOCKED', 'RELEASED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wallets table: holds user balances
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance_available NUMERIC(10, 2) NOT NULL DEFAULT 0,
    balance_locked NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_balance_non_negative CHECK (balance_available >= 0 AND balance_locked >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Orders table: with value snapshots from service at creation time
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    collaborator_id UUID NOT NULL REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    status order_status NOT NULL DEFAULT 'NOVO',
    payment_status payment_status NOT NULL DEFAULT 'LOCKED',
    -- Snapshot values (immutable after creation)
    total_value NUMERIC(10, 2) NOT NULL,
    company_percent INTEGER NOT NULL,
    collab_percent INTEGER NOT NULL,
    collab_value NUMERIC(10, 2) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_order_percents CHECK (company_percent >= 0 AND collab_percent >= 0),
    CONSTRAINT check_order_values CHECK (total_value >= 0 AND collab_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_student_id ON orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_collaborator_id ON orders(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);

-- Transactions table: immutable ledger (never UPDATE or DELETE)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    order_id UUID REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    type tx_type NOT NULL,
    status tx_status NOT NULL DEFAULT 'LOCKED',
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Create wallets for existing COLLABORATOR users
INSERT INTO wallets (user_id)
SELECT id FROM users WHERE role = 'COLLABORATOR'
ON CONFLICT (user_id) DO NOTHING;

-- Trigger function to auto-create wallet for new COLLABORATOR users
CREATE OR REPLACE FUNCTION create_wallet_for_collaborator()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'COLLABORATOR' THEN
        INSERT INTO wallets (user_id) VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_create_collaborator_wallet
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION create_wallet_for_collaborator();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
