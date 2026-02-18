-- Drop indexes first
DROP INDEX IF EXISTS idx_orders_punctuality;
DROP INDEX IF EXISTS idx_orders_ranking;
DROP INDEX IF EXISTS idx_ratings_collaborator_created;
DROP INDEX IF EXISTS idx_ratings_collaborator_id;

-- Drop table
DROP TABLE IF EXISTS ratings;
