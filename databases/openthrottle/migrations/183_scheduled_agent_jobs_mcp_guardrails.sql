-- MCP scheduling guardrails (threat-model row T10, docs/openthrottle/webhook-triggered-agent-jobs.md):
-- agent-created jobs are marked, retried creates are idempotent, and an operator can require a human
-- to approve an agent-created job before it arms.
--
--   created_via      'ui' for the GraphQL mutations a person uses, 'mcp' for the agent mutations.
--                    The agent path may update or delete only 'mcp' jobs.
--   idempotency_key  caller-supplied key; unique per (owner, key) among live jobs, so a retried
--                    create returns the existing job instead of a duplicate.
--   approval_state   'pending' while an agent-created job waits for a human to approve it.

ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'ui';
ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;
ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS approval_state TEXT NOT NULL DEFAULT 'not_required';

ALTER TABLE scheduled_agent_jobs DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_created_via;
ALTER TABLE scheduled_agent_jobs ADD CONSTRAINT chk_scheduled_agent_jobs_created_via
  CHECK (created_via IN ('ui', 'mcp'));

ALTER TABLE scheduled_agent_jobs DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_approval_state;
ALTER TABLE scheduled_agent_jobs ADD CONSTRAINT chk_scheduled_agent_jobs_approval_state
  CHECK (approval_state IN ('not_required', 'pending', 'approved'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_agent_jobs_owner_idempotency_key_live
  ON scheduled_agent_jobs (owner_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN scheduled_agent_jobs.created_via IS
  'Which surface created this job: ui (the Developer UI GraphQL mutations) or mcp (the agent mutations behind the openthrottle-mcp scheduling tools). The agent path may update or delete only mcp jobs.';

COMMENT ON COLUMN scheduled_agent_jobs.idempotency_key IS
  'Caller-supplied idempotency key for an agent-created job; NULL for UI-created jobs. Unique per (owner_user_id, idempotency_key) among live jobs, so a retried create returns the existing job.';

COMMENT ON COLUMN scheduled_agent_jobs.approval_state IS
  'not_required (default), pending (an agent-created job awaiting human approval; stored disabled and cannot be enabled until approved) or approved (a human approved it).';
