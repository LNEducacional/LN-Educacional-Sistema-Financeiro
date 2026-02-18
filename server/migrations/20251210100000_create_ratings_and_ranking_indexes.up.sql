-- Ratings table for quality metric
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) UNIQUE,
    student_id UUID NOT NULL REFERENCES users(id),
    collaborator_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rating queries
CREATE INDEX IF NOT EXISTS idx_ratings_collaborator_id ON ratings(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_ratings_collaborator_created ON ratings(collaborator_id, created_at);

-- Composite indexes for ranking queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_orders_ranking ON orders(collaborator_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_punctuality ON orders(collaborator_id, status, due_date, created_at);
