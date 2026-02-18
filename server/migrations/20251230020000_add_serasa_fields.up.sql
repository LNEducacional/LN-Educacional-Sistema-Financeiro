-- Migration: Add fields required for Serasa/SPC integration
-- CPF, phone, birth_date and address fields for external bureau reporting

-- Personal identification
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Address fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_zipcode VARCHAR(8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state CHAR(2);

-- Unique index on CPF (partial - only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf) WHERE cpf IS NOT NULL;

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

COMMENT ON COLUMN users.cpf IS 'CPF without formatting (11 digits)';
COMMENT ON COLUMN users.phone IS 'Phone with country code (e.g., 5511999999999)';
COMMENT ON COLUMN users.address_state IS 'Brazilian state abbreviation (e.g., SP, RJ)';
