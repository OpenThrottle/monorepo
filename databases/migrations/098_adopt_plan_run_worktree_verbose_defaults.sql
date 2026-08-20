-- Adopt the new programmatic plan-run defaults (worktree + verbose) for plans that were never
-- configured, and only for those.
--
-- Before this change, `getDefaultPlanRunConfigRalphV1()` wrote debugCli='omit' and worktreeCli='omit'
-- into every new plan's run_config, so an untouched plan is indistinguishable from a deliberate
-- opt-out by looking at those two keys alone. What IS distinguishable is the whole ralph block: a
-- plan whose entire block equals the old default block was demonstrably never customized
-- (planHasCustomRunConfig would have reported false for it), so re-pointing it at the new defaults
-- preserves the user's intent rather than overriding it. Any plan that differs anywhere in the block
-- is left exactly as it is.
--
-- Idempotent by construction: after the update the block no longer equals the old default, so a
-- re-run matches zero rows. It never re-stamps a row it already touched.
--
-- See docs/openthrottle/plan-run-worktrees.md.

UPDATE plans
SET
    run_config = jsonb_set(
        run_config,
        '{ralph}',
        (run_config -> 'ralph') || '{"debugCli": "verbose", "worktreeCli": "named"}'::jsonb
    )
WHERE
    run_config -> 'ralph' = '{
      "debugCli": "omit",
      "executionBackend": "cursor",
      "iterationTimeoutText": "",
      "iterations": 10,
      "model": "auto",
      "project": "",
      "prompt": "/agents-ralph",
      "promptFile": "",
      "promptLayer": "named",
      "skipWorktreeSetup": false,
      "worktreeBase": "",
      "worktreeCli": "omit",
      "worktreeName": ""
    }'::jsonb;
