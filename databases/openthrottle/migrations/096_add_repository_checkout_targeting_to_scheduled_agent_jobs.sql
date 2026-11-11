-- Repository targeting for scheduled agent jobs (OT plan ef4b5c75).
--
-- Until now the only way to say *where* a scheduled job runs was the free-text
-- `cwd` column: an absolute host path the user had to know and hand-type, never
-- validated, never ownership-checked, and not container-path aware. Nothing tied
-- a run to a repository, so a run's history could not answer "which checkout did
-- this execute in?".
--
-- This adopts the model the streaming chat path already uses (StartConversationStream
-- takes a repositoryId and resolves it server-side): a schedule points at a registered
-- repository_checkouts row, and the server derives the cwd from that checkout's
-- filesystem_path through toContainerPath(). Resolution precedence, documented in one
-- place in scheduled-agent-jobs.constants.ts, is:
--
--   1. repository_checkout_id -> checkout filesystem_path -> toContainerPath(...)
--   2. explicit cwd (legacy rows / power users)
--   3. WORKSPACE_ROOT -> process.cwd()
--
-- Runs additionally snapshot both the targeted checkout and the exact resolved
-- directory, mirroring how migration 087 added settings_snapshot: a run's provenance
-- must survive the schedule being edited or the checkout being deleted afterwards.
--
-- All additive + nullable, ON DELETE SET NULL, no backfill: existing rows keep `cwd`
-- and continue to resolve through the legacy branch unchanged.

ALTER TABLE scheduled_agent_jobs
    ADD COLUMN IF NOT EXISTS repository_checkout_id UUID NULL REFERENCES repository_checkouts (id) ON DELETE SET NULL;

COMMENT ON COLUMN scheduled_agent_jobs.repository_checkout_id IS
    'The registered repository checkout this schedule runs in; resolved server-side to a cwd via the checkout''s filesystem_path and toContainerPath() (container-path aware), ownership-checked against owner_user_id. Null means the legacy explicit `cwd` or the WORKSPACE_ROOT fallback is used instead. Set to NULL when the checkout is deleted, which drops the schedule back to that fallback.';

COMMENT ON COLUMN scheduled_agent_jobs.cwd IS
    'Legacy/explicit process cwd for the agent CLI, used only when repository_checkout_id is NULL; null then falls back to WORKSPACE_ROOT ?? process.cwd(). Deprecated in GraphQL in favour of repositoryCheckoutId — prefer targeting a registered checkout.';

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_jobs_repository_checkout_id
    ON scheduled_agent_jobs (repository_checkout_id)
    WHERE repository_checkout_id IS NOT NULL;

ALTER TABLE scheduled_agent_job_runs
    ADD COLUMN IF NOT EXISTS repository_checkout_id UUID NULL REFERENCES repository_checkouts (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolved_cwd TEXT NULL;

COMMENT ON COLUMN scheduled_agent_job_runs.repository_checkout_id IS
    'The repository checkout this run targeted at fire time, snapshot from the schedule when the run row is created. Retained independently of the schedule so editing the schedule later does not rewrite this run''s history; set to NULL if the checkout is subsequently deleted (resolved_cwd still records where the run happened). Null for legacy runs and for schedules that use the explicit-cwd/WORKSPACE_ROOT fallback.';

COMMENT ON COLUMN scheduled_agent_job_runs.resolved_cwd IS
    'The exact directory the agent CLI was spawned in for this run, after applying the repository_checkout_id -> cwd -> WORKSPACE_ROOT -> process.cwd() precedence and toContainerPath(). This is the authoritative record of where the run actually executed — the schedule''s current target may since have changed. Null for legacy rows created before this column existed.';
