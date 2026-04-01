-- Add indexes to support listPlansByStatus filter and sort patterns.
-- See databases/cortex/INDEX_AUDIT.md.

-- Sort by updated_at (listPlansByStatus supports ORDER BY updated_at)
CREATE INDEX IF NOT EXISTS idx_plans_updated_at ON plans (updated_at DESC);

-- Composite indexes for common filter+sort: status then created_at or updated_at
CREATE INDEX IF NOT EXISTS idx_plans_status_created_at ON plans (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_status_updated_at ON plans (status, updated_at DESC);
