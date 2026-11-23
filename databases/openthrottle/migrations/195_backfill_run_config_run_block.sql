-- Collapse the `ralph` and `otLoop` run-config blocks into one `run` block (OT plan 624a1036, decisions
-- Q3, Q4, Q15, Q16).
--
-- plans.run_config (the plan's saved run configuration) and plan_runs.run_config_snapshot (the resolved
-- configuration a run was enqueued with) both carried a `ralph` block (the agent tuning), an optional
-- `otLoop` block (OT Loop validation commands) and an optional `runner` marker. OT Loop is the only
-- runner, so:
--   * `ralph` and `otLoop` become one `run` block,
--   * `runner` is dropped,
--   * `executionBackend` becomes `driver`,
--   * the fields only the Ralph runner read are dropped: iterations, prompt, promptFile, promptLayer,
--     project, skipWorktreeSetup, worktreeBase and worktreeCli (no-worktree runs no longer exist),
--   * plans.run_config keeps `worktreeName` and `worktreeCleanup`; the snapshot's `worktree` becomes
--     `worktreeName`,
--   * plans.run_config's text `iterationTimeoutText` becomes the number `iterationTimeoutSeconds`
--     (kept only when it was a positive integer), the same key the snapshot already used.
--
-- A row whose `ralph` block is missing (the bare `{"version":1}` shell) only has the stale keys stripped:
-- the application already read such a row as "all defaults".
--
-- Idempotent: only rows that still carry a `ralph`, `otLoop` or `runner` key are touched, and the
-- update removes all three, so a re-run matches zero rows.

UPDATE plans AS p
SET run_config = (p.run_config - 'ralph' - 'otLoop' - 'runner')
  || CASE
       WHEN r.run IS NULL THEN '{}'::jsonb
       ELSE jsonb_build_object('run', r.run)
     END
FROM (
  SELECT
    id,
    CASE
      WHEN jsonb_typeof(run_config -> 'ralph') = 'object' THEN jsonb_strip_nulls(
        jsonb_build_object(
          'debugCli', run_config -> 'ralph' -> 'debugCli',
          'driver', COALESCE(run_config -> 'ralph' -> 'executionBackend', '"cursor"'::jsonb),
          'effort', run_config -> 'ralph' -> 'effort',
          'finalValidationCommands', run_config -> 'otLoop' -> 'finalValidationCommands',
          'iterationTimeoutSeconds', CASE
            WHEN trim(run_config -> 'ralph' ->> 'iterationTimeoutText') ~ '^[0-9]{1,9}$'
              AND trim(run_config -> 'ralph' ->> 'iterationTimeoutText')::int >= 1
            THEN to_jsonb(trim(run_config -> 'ralph' ->> 'iterationTimeoutText')::int)
          END,
          'maxRetries', run_config -> 'otLoop' -> 'maxRetries',
          'model', COALESCE(run_config -> 'ralph' -> 'model', '"auto"'::jsonb),
          'setupCommands', run_config -> 'otLoop' -> 'setupCommands',
          'validationCommands', run_config -> 'otLoop' -> 'validationCommands',
          'worktreeCleanup', run_config -> 'ralph' -> 'worktreeCleanup',
          'worktreeName', COALESCE(run_config -> 'ralph' -> 'worktreeName', '""'::jsonb)
        )
      )
    END AS run
  FROM plans
) AS r
WHERE r.id = p.id
  AND p.run_config ?| ARRAY['ralph', 'otLoop', 'runner'];

UPDATE plan_runs AS pr
SET run_config_snapshot = (pr.run_config_snapshot - 'ralph' - 'otLoop' - 'runner')
  || CASE
       WHEN r.run IS NULL THEN '{}'::jsonb
       ELSE jsonb_build_object('run', r.run)
     END
FROM (
  SELECT
    id,
    CASE
      WHEN jsonb_typeof(run_config_snapshot -> 'ralph') = 'object' THEN jsonb_strip_nulls(
        jsonb_build_object(
          'debug', run_config_snapshot -> 'ralph' -> 'debug',
          'driver', COALESCE(run_config_snapshot -> 'ralph' -> 'executionBackend', '"cursor"'::jsonb),
          'effort', run_config_snapshot -> 'ralph' -> 'effort',
          'finalValidationCommands', run_config_snapshot -> 'otLoop' -> 'finalValidationCommands',
          'iterationTimeoutSeconds', run_config_snapshot -> 'ralph' -> 'iterationTimeoutSeconds',
          'maxRetries', run_config_snapshot -> 'otLoop' -> 'maxRetries',
          'model', run_config_snapshot -> 'ralph' -> 'model',
          'setupCommands', run_config_snapshot -> 'otLoop' -> 'setupCommands',
          'validationCommands', run_config_snapshot -> 'otLoop' -> 'validationCommands',
          'worktreeName', run_config_snapshot -> 'ralph' -> 'worktree'
        )
      )
    END AS run
  FROM plan_runs
  WHERE run_config_snapshot IS NOT NULL
) AS r
WHERE r.id = pr.id
  AND pr.run_config_snapshot ?| ARRAY['ralph', 'otLoop', 'runner'];

COMMENT ON COLUMN plans.run_config IS 'Versioned run defaults for this plan (PlanRunConfigStorage v1 in @openthrottle/openthrottle-plan-config). Fields: version, target (mode, taskId), workspace (checkoutId, repositoryId, workingDirectory) and run (driver, model, effort, debugCli, iterationTimeoutSeconds, worktreeName, worktreeCleanup, plus the optional OT Loop setupCommands, validationCommands, finalValidationCommands and maxRetries). planId is implicit (plans.id). Validated on GraphQL write; see plan-run-config-storage.validation.ts.';

COMMENT ON COLUMN plan_runs.run_config_snapshot IS 'Resolved PlanRunConfigSnapshot v1 at enqueue: target, workspace and the run block (driver, model, effort, debug, iterationTimeoutSeconds, worktreeName and the OT Loop validation fields), plus the optional embedded jobRunHooks. Null for runs queued before this column existed. See plan-run-config-snapshot in @openthrottle/openthrottle-plan-config.';

COMMENT ON COLUMN plan_runs.model IS 'Resolved agent model id for this run (e.g. claude-fable-5), captured at kickoff. Queryable projection of run_config_snapshot.run.model (the raw record stays the source). NULL for legacy rows lacking snapshot data.';
