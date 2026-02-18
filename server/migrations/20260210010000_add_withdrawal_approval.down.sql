-- Rollback: remove approval columns from payouts
-- Note: PostgreSQL does not support removing values from enums,
-- so APPROVED and REJECTED values will remain in the enum type.

DROP INDEX IF EXISTS idx_payouts_reviewed_at;

ALTER TABLE payouts
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS rejected_by,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS reviewed_at;
