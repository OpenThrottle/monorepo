-- Enable pg_trgm for ILIKE/substring search on plans.title (listPlansByStatus title filter).
-- See databases/cortex/INDEX_AUDIT.md.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_plans_title_trgm ON plans USING gin (title gin_trgm_ops);
