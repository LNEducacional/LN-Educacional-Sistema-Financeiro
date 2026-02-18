-- Add delinquency tracking fields to users table
-- Used by the delinquency worker to mark students with overdue unpaid orders

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_delinquent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS delinquent_since TIMESTAMP WITH TIME ZONE;

-- Index for efficient delinquent user queries
CREATE INDEX IF NOT EXISTS idx_users_is_delinquent ON users(is_delinquent) WHERE is_delinquent = TRUE;

-- Comment explaining the business logic
COMMENT ON COLUMN users.is_delinquent IS 'True if user has overdue order exceeding grace period';
COMMENT ON COLUMN users.delinquent_since IS 'Date when user was first marked as delinquent';
