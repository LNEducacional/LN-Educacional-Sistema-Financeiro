-- Order revisions table for tracking rejection reasons
-- Part of Task 05: Fluxo de Aprovacao
CREATE TABLE IF NOT EXISTS order_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_revisions_order_id ON order_revisions(order_id);

COMMENT ON TABLE order_revisions IS 'Stores revision history when student requests changes to delivered work';
COMMENT ON COLUMN order_revisions.reason IS 'Student feedback explaining why the delivery needs revision';
