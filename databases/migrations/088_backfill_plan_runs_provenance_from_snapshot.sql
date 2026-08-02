-- Best-effort backfill of the new plan_runs provenance columns from the existing
-- run_config_snapshot JSONB (OT plan 4d1adefa, follow-on to migration 087).
--
-- model and checkout_id already live inside run_config_snapshot for runs enqueued
-- before columns 087 existed; lift them into the queryable columns. branch is NOT
-- backfillable (it was never captured pre-087) and stays NULL for legacy rows.
--
-- Idempotent + backfill-safe: only touches rows where the column is still NULL and
-- the snapshot actually carries a value, so re-running is a no-op and it never
-- re-stamps rows already populated by the write path. Runs that lack snapshot data
-- are simply skipped (no blocking).

-- model <- run_config_snapshot.ralph.model
UPDATE plan_runs
SET model = run_config_snapshot -> 'ralph' ->> 'model'
WHERE model IS NULL
  AND run_config_snapshot -> 'ralph' ->> 'model' IS NOT NULL
  AND run_config_snapshot -> 'ralph' ->> 'model' <> '';

-- checkout_id <- run_config_snapshot.workspace.checkoutId, but only when that
-- checkout row still exists (the FK is ON DELETE SET NULL; a stale snapshot id
-- for a torn-down checkout must not resurrect a dangling reference). The EXISTS
-- guard keeps the write FK-safe.
UPDATE plan_runs pr
SET checkout_id = (pr.run_config_snapshot -> 'workspace' ->> 'checkoutId')::uuid
WHERE pr.checkout_id IS NULL
  AND pr.run_config_snapshot -> 'workspace' ->> 'checkoutId' IS NOT NULL
  AND pr.run_config_snapshot -> 'workspace' ->> 'checkoutId' <> ''
  AND EXISTS (
    SELECT 1 FROM repository_checkouts rc
    WHERE rc.id = (pr.run_config_snapshot -> 'workspace' ->> 'checkoutId')::uuid
  );
