-- High-fidelity re-date of plans.completed_at from plan_output_stream.
--
-- Context: migration 056 backfilled completed_at = updated_at as a best-effort
-- fallback. For plans completed before completed_at existed, updated_at had been
-- mass-rewritten by pre-ledger `database:migrate` runs, collapsing ~99% of plan
-- completions onto a single migrate-run UTC day (2026-07-10). This migration
-- re-dates those collapsed rows from an IMMUNE signal: the plan's last
-- plan_output_stream entry (append/insert-only; never touched by updated_at
-- triggers, so its timestamps reflect real activity).
--
-- Scope guardrails (make this idempotent + safe to re-run):
--   * Only plans whose completed_at currently lands on the collapse day
--     (2026-07-10 UTC) are eligible; organically-dated rows are never touched.
--   * Only plans that actually have a plan_output_stream row are re-dated;
--     the rest (no immune signal) keep their approximate 056 value.
--   * The new value must differ (IS DISTINCT FROM) so a second run is a no-op.
--
-- completed_at is NOT driven by updated_at triggers, but we still disable the
-- BEFORE UPDATE trigger for the write so updated_at is not re-stamped — the same
-- failure mode this whole column exists to avoid.

ALTER TABLE plans DISABLE TRIGGER update_plans_updated_at;

WITH last_output AS (
  SELECT plan_id, MAX(created_at) AS last_ts
  FROM plan_output_stream
  GROUP BY plan_id
)
UPDATE plans p
SET completed_at = lo.last_ts
FROM last_output lo
WHERE lo.plan_id = p.id
  AND p.completed_at IS NOT NULL
  AND (timezone('UTC', p.completed_at))::date = DATE '2026-07-10'
  AND p.completed_at IS DISTINCT FROM lo.last_ts;

ALTER TABLE plans ENABLE TRIGGER update_plans_updated_at;
