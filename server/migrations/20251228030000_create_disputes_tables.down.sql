-- Rollback: Drop disputes tables and types

DROP TABLE IF EXISTS dispute_evidence;
DROP TABLE IF EXISTS dispute_comments;
DROP TABLE IF EXISTS disputes;

DROP TYPE IF EXISTS dispute_resolution;
DROP TYPE IF EXISTS dispute_status;
