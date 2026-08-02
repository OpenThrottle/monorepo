-- Rich per-run execution metadata for scheduled_agent_job_runs (OT plan 2c9bd39e).
--
-- Today a run row records only status/timing/exit. This adds, per run:
--   * a settings snapshot (driver/model/reasoning tier/permission mode/run-config)
--     captured at execution time so later edits to the schedule don't rewrite history;
--   * normalized token counts + estimated dollar cost, parsed in the processor from the
--     buffered CLI output via the shared @openthrottle/agentic-token-usage normalizer;
--   * the un-normalized usage blob for audit/debug and future re-derivation.
--
-- Denormalized directly on the run row (not joined to agent_token_usage): scheduled runs
-- are run-scoped, not conversation/message-scoped. Column shape mirrors agent_token_usage
-- (migration 083) — BIGINT counts (Postgres returns them as strings, read back via the
-- entity's number transformer) and NUMERIC(12,6) cost — so the normalizer output persists
-- identically on both surfaces. All additive + nullable: legacy rows keep NULLs.

ALTER TABLE scheduled_agent_job_runs
    ADD COLUMN IF NOT EXISTS settings_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS input_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS output_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS cache_read_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS cache_write_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS reasoning_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS total_tokens BIGINT,
    ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12, 6),
    ADD COLUMN IF NOT EXISTS raw_usage JSONB;

COMMENT ON COLUMN scheduled_agent_job_runs.settings_snapshot IS
    'Effective run settings at execution time (driver, model, reasoning tier, permission mode, run-config), captured from the job payload when the run is created so later schedule edits do not rewrite this run''s history. Null for legacy rows / runs created before snapshotting.';

COMMENT ON COLUMN scheduled_agent_job_runs.input_tokens IS
    'Prompt/input tokens for the run; parsed from the buffered CLI output via the shared normalizer. Null when the backend did not report it.';

COMMENT ON COLUMN scheduled_agent_job_runs.output_tokens IS
    'Completion/output tokens for the run; parsed from the buffered CLI output. Null when the backend did not report it.';

COMMENT ON COLUMN scheduled_agent_job_runs.cache_read_tokens IS
    'Tokens served from the prompt cache (claude cache_read_input_tokens, opencode cache.read); null when unreported.';

COMMENT ON COLUMN scheduled_agent_job_runs.cache_write_tokens IS
    'Tokens written to the prompt cache (claude cache_creation_input_tokens, opencode cache.write); null when unreported.';

COMMENT ON COLUMN scheduled_agent_job_runs.reasoning_tokens IS
    'Reasoning/thinking tokens accounted separately (opencode tokens.reasoning, grok usage.reasoning_tokens); null when unreported.';

COMMENT ON COLUMN scheduled_agent_job_runs.total_tokens IS
    'Total tokens: the backend explicit total else input+output when either present; null when nothing reported.';

COMMENT ON COLUMN scheduled_agent_job_runs.cost_usd IS
    'Estimated dollar cost of the run when the backend prices it (claude totalCostUsd, opencode summed cost); null when unpriced.';

COMMENT ON COLUMN scheduled_agent_job_runs.raw_usage IS
    'The run''s normalized usage payload (NormalizedTokenUsage) as JSONB, retained for audit/debug and future re-derivation.';
