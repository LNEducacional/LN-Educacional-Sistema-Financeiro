-- Rollback: Drop delinquency_history table

DROP INDEX IF EXISTS idx_delinquency_history_open;
DROP INDEX IF EXISTS idx_delinquency_history_started_at;
DROP INDEX IF EXISTS idx_delinquency_history_user_id;
DROP TABLE IF EXISTS delinquency_history;
