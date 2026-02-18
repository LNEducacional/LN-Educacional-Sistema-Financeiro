-- Rollback delinquency tracking fields
DROP INDEX IF EXISTS idx_users_is_delinquent;
ALTER TABLE users DROP COLUMN IF EXISTS delinquent_since;
ALTER TABLE users DROP COLUMN IF EXISTS is_delinquent;
