-- Add APPROVED and REJECTED values to payout_status enum
-- and add approval/rejection tracking columns to payouts table

ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payouts_reviewed_at ON payouts(reviewed_at) WHERE reviewed_at IS NOT NULL;
