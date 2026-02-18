-- Migration: Create delinquency_history table
-- Tracks multiple periods of delinquency per user for complete negative history

CREATE TABLE IF NOT EXISTS delinquency_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_owed_at_start DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_owed_at_end DECIMAL(12,2),
    triggering_order_ids UUID[] NOT NULL DEFAULT '{}',
    resolution_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_delinquency_history_user_id ON delinquency_history(user_id);

-- Index for date range queries
CREATE INDEX idx_delinquency_history_started_at ON delinquency_history(started_at);

-- Index for finding open (active) delinquency records
CREATE INDEX idx_delinquency_history_open ON delinquency_history(user_id) WHERE ended_at IS NULL;

COMMENT ON TABLE delinquency_history IS 'Tracks complete history of delinquency periods per user';
COMMENT ON COLUMN delinquency_history.ended_at IS 'NULL means currently delinquent';
COMMENT ON COLUMN delinquency_history.resolution_type IS 'PAID, CANCELLED, ADMIN_OVERRIDE, etc.';
