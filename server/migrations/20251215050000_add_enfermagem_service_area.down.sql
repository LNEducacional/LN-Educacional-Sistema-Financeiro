-- Note: PostgreSQL doesn't support removing enum values directly
-- This down migration will only work if no services use ENFERMAGEM
-- A safe rollback would require recreating the enum type

-- If you need to rollback, you'll need to:
-- 1. Update any services using ENFERMAGEM to another area
-- 2. Recreate the enum without ENFERMAGEM
-- 3. Update the column to use the new enum

-- For now, this is a no-op as enum value removal is complex in PostgreSQL
SELECT 1;
