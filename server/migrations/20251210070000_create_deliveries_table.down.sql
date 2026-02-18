-- Rollback: Drop deliveries table
DROP INDEX IF EXISTS idx_deliveries_created_at;
DROP INDEX IF EXISTS idx_deliveries_order_id;
DROP TABLE IF EXISTS deliveries;
