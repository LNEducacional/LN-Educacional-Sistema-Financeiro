-- Rollback da tabela system_settings

DROP INDEX IF EXISTS idx_system_settings_key;
DROP TABLE IF EXISTS system_settings;
