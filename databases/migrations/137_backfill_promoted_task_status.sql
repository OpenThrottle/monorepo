-- Backfill tasks that promote_task closed before PROMOTED existed (OT plan e0c71031).
--
-- Until 136 added PROMOTED, promotion closed the source task as SKIPPED plus a `promoted` tag
-- (task_tags.tag = 'promoted'). This moves exactly those rows to PROMOTED. It is its own
-- migration because a value added by ALTER TYPE ... ADD VALUE cannot be used in the transaction
-- that added it.
--
-- THE RULE: status = 'SKIPPED' AND a `promoted` task_tags row -> 'PROMOTED'. The SKIPPED
-- predicate makes a second run update nothing.
--
-- NOT TOUCHED. SKIPPED tasks without the tag are genuine "won't do" or the reversible orphan
-- soft-close (SOFT_CLOSED_TASK_STATUS), neither of which is a promotion. Plans: none has ever
-- been promoted. The tag itself stays; readers accept status OR tag for one release.
--
-- NO status_change ARTIFACTS. None of the tasks this moves has any work-ledger history
-- (payload->>'id' matches no artifact), so databases/reports/work-ledger-status-agreement.sql
-- excludes them and the backfill cannot create a disagreement. Promotion itself is recorded by
-- the plan_promotion artifact, which this leaves alone.
--
-- MEASURED against the OpenThrottle live database on 2026-10-30, the day this was written.
-- These are moving numbers; the rule is fixed and the rows are recomputed when this runs.
--   SKIPPED + promoted tag (moved)            13
--   promoted tag on any other status           0
--   SKIPPED without the tag (left alone)      26
--   ledger artifacts naming a moved task       0

DO $$
DECLARE
  moved integer;
BEGIN
  UPDATE tasks t
  SET status = 'PROMOTED'
  WHERE t.status = 'SKIPPED'
    AND EXISTS (
      SELECT 1 FROM task_tags tt
      WHERE tt.task_id = t.id AND tt.tag = 'promoted'
    );
  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE '137_backfill_promoted_task_status: % task(s) moved SKIPPED -> PROMOTED', moved;
END $$;
