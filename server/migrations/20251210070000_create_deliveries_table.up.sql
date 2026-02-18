-- Task 04: Deliveries table for file upload history
-- Each order can have multiple deliveries (revision history)

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookup by order
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);

-- Index for listing by date
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);
