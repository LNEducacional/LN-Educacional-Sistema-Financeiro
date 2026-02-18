-- PostgreSQL does not support removing values from ENUMs directly.
-- This migration prevents rollback if there are users with FINANCEIRO role.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE role = 'FINANCEIRO') THEN
        RAISE EXCEPTION 'Cannot rollback: users with FINANCEIRO role exist. Migrate them first.';
    END IF;
END $$;

-- Note: The FINANCEIRO value will remain in the enum but won't be usable
-- if this check passes. For complete removal, recreate the type.
