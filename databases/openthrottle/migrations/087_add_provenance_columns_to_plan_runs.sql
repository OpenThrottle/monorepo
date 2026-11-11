-- Run provenance: promote branch, model, and worktree checkout to first-class,
-- queryable columns on plan_runs (OT plan 4d1adefa).
--
-- At run kickoff we know four things: WHAT (plan/task), WHICH agent + model,
-- WHERE on disk (worktree folder), and WHICH git branch. Today only the agent
-- (plan_runs.execution_backend) is a real column; model + worktree path live
-- buried in run_config_snapshot JSONB (hard to query/index), and branch is not
-- stored per-run at all (only repositories.default_branch, repo-level). That
-- blocks branch->PR mapping, locating the worktree folder, and "open in editor"
-- deep-links. These columns are the queryable projection; run_config_snapshot
-- stays the raw record.
--
-- All three are captured at run creation. Columns stay NULLable so legacy and
-- best-effort-backfilled rows survive; branch enforcement lives at the enqueue
-- INPUT boundary (required kickoff arg), not a DB NOT NULL constraint.

ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE plan_runs ADD COLUMN IF NOT EXISTS checkout_id UUID;

-- checkout_id -> repository_checkouts(id): the run's on-disk home. ON DELETE SET
-- NULL so removing a checkout (e.g. worktree teardown) preserves the run row and
-- its other provenance; the path simply becomes unresolvable. Added separately
-- and idempotently so re-running the migration does not error on the existing
-- constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'plan_runs_checkout_id_fkey'
      AND table_name = 'plan_runs'
  ) THEN
    ALTER TABLE plan_runs
      ADD CONSTRAINT plan_runs_checkout_id_fkey
      FOREIGN KEY (checkout_id) REFERENCES repository_checkouts (id) ON DELETE SET NULL;
  END IF;
END $$;

-- checkout_id is a join target (plan_runs -> repository_checkouts.filesystem_path
-- for editor deep-links); branch is looked up directly for the branch->PR use-case.
-- Both are partial (WHERE NOT NULL) since most legacy rows carry neither.
CREATE INDEX IF NOT EXISTS idx_plan_runs_checkout_id
  ON plan_runs (checkout_id)
  WHERE checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_runs_branch
  ON plan_runs (branch)
  WHERE branch IS NOT NULL;

COMMENT ON COLUMN plan_runs.branch IS 'Git branch this run operates on, captured at kickoff as a REQUIRED enqueue input (not inferred server-side). The clearest provenance gap this plan closes: previously only repositories.default_branch (repo-level) existed. Powers branch->PR mapping. NULLable for legacy/backfilled rows; enforcement is at the enqueue input boundary, not a DB constraint.';

COMMENT ON COLUMN plan_runs.model IS 'Resolved agent model id for this run (e.g. claude-fable-5), captured at kickoff. Queryable projection of run_config_snapshot.ralph.model (the raw record stays the source). NULL for legacy rows lacking snapshot data.';

COMMENT ON COLUMN plan_runs.checkout_id IS 'repository_checkouts row (kind=worktree for provisioned runs) giving this run its durable on-disk home; filesystem_path there powers "open in editor" deep-links. Captured at kickoff from run_config_snapshot.workspace.checkoutId. ON DELETE SET NULL so checkout teardown keeps the run row. NULL for legacy rows or runs without a resolved checkout.';
