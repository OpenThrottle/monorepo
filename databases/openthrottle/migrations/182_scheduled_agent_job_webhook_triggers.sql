-- Webhook-triggered agent jobs: the ingress tables and the new run trigger.
-- Design and threat model: docs/openthrottle/webhook-triggered-agent-jobs.md.
--
-- A webhook is an EXTRA trigger on an existing scheduled agent job, not a new job kind:
--   scheduled_agent_job_webhook_triggers   one per job: URL token hash, encrypted HMAC secret,
--                                          signature preset, filters and admission caps.
--   scheduled_agent_job_webhook_deliveries append-only log of every request that matched a trigger
--                                          (accepted or rejected); purged after 7 days by the
--                                          data-retention sweep, which is what makes the dedupe
--                                          key a 7-day key.
-- scheduled_agent_job_runs.trigger gains 'webhook'.
--
-- The deliveries log keeps the timestamp in `created_at` (the BaseHardDeleteModel column): it is
-- the moment the request was received.
--
-- Both foreign keys are added in their own pg_constraint-guarded statements (see
-- skills/ot-postgres/SKILL.md, "Foreign keys"). A job is soft deleted (a delete fires no foreign
-- key action), so the trigger row is removed by the service when its job is deleted.

CREATE TABLE IF NOT EXISTS scheduled_agent_job_webhook_triggers (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    scheduled_agent_job_id UUID NOT NULL,
    token_hash BYTEA NOT NULL,
    token_prefix TEXT NOT NULL,
    secret_ciphertext BYTEA NOT NULL,
    signature_preset TEXT NOT NULL DEFAULT 'generic',
    signature_header TEXT NOT NULL DEFAULT 'X-OT-Signature',
    signature_encoding TEXT NOT NULL DEFAULT 'hex',
    timestamp_header TEXT NULL,
    timestamp_tolerance_seconds INTEGER NOT NULL DEFAULT 300,
    delivery_id_header TEXT NULL,
    filters JSONB NOT NULL DEFAULT '[]'::jsonb,
    coalesce_window_ms INTEGER NOT NULL DEFAULT 0,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,
    max_in_flight INTEGER NOT NULL DEFAULT 3,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    rotated_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheduled_agent_job_webhook_triggers_job UNIQUE (scheduled_agent_job_id),
    CONSTRAINT uq_scheduled_agent_job_webhook_triggers_token_hash UNIQUE (token_hash),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_preset CHECK (
        signature_preset IN ('generic', 'github', 'custom')
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_encoding CHECK (
        signature_encoding IN ('hex', 'base64')
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_tolerance CHECK (
        timestamp_tolerance_seconds BETWEEN 30 AND 900
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_coalesce CHECK (
        coalesce_window_ms BETWEEN 0 AND 3600000
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_rate CHECK (
        rate_limit_per_minute BETWEEN 1 AND 120
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_in_flight CHECK (
        max_in_flight BETWEEN 1 AND 10
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_triggers_filters CHECK (
        jsonb_typeof(filters) = 'array' AND jsonb_array_length(filters) <= 16
    )
);

COMMENT ON TABLE scheduled_agent_job_webhook_triggers IS 'OpenThrottle webhook trigger of a scheduled agent job (at most one per job): the hashed URL token, the encrypted HMAC secret, the signature preset, the payload filters and the admission caps that let an external system start the job by POSTing to /webhooks/agent-jobs/:token.';

COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.scheduled_agent_job_id IS 'The scheduled_agent_jobs row this trigger starts. Soft-deleted jobs are not an FK action, so the service deletes the trigger when it deletes the job.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.token_hash IS 'sha256 of the URL token (32 random bytes, base64url). The token itself is shown once and never stored; ingress looks the trigger up by this hash and re-compares it with timingSafeEqual.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.token_prefix IS 'First 6 characters of the URL token, kept only so the UI can tell tokens apart.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.secret_ciphertext IS 'The HMAC-SHA256 secret, AES-256-GCM encrypted with WEBHOOK_SECRET_ENCRYPTION_KEY: 12-byte IV || 16-byte auth tag || ciphertext. Never plaintext; ingress answers 503 when the key is not configured.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.signature_preset IS 'generic (X-OT-Signature over "<timestamp>.<body>", hex) | github (X-Hub-Signature-256 over the body, "sha256=" + hex) | custom (configured header and encoding).';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.signature_header IS 'Request header carrying the signature; fixed by the generic and github presets, configurable for custom.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.signature_encoding IS 'hex | base64. How the signature header encodes the HMAC digest (github is hex with a "sha256=" prefix).';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.timestamp_header IS 'Header carrying the unix-seconds timestamp that is part of the signed string; NULL when the preset has none (github), which leaves the 7-day dedupe as the only replay defence.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.timestamp_tolerance_seconds IS 'A delivery is rejected unless |now - timestamp| is within this many seconds (30 to 900). Only applies when timestamp_header is set.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.delivery_id_header IS 'Header carrying the sender delivery id used as the dedupe key; NULL falls back to the sha256 of the body.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.filters IS 'JSON array of at most 16 filters, all of which must match: { path, op, value? } with op equals | not_equals | in | exists | not_exists | prefix. No regex, by design.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.coalesce_window_ms IS 'Leading-edge coalesce window in ms (0 = off, max 1 hour): deliveries inside the window after an accepted one are recorded coalesced and do not run.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.rate_limit_per_minute IS 'Most accepted deliveries per trailing 60 seconds (1 to 120), counted from the delivery log so it survives a restart.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.max_in_flight IS 'Most webhook-triggered runs of the job queued or running at once (1 to 10); over it ingress answers 429 queue_full.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.enabled IS 'Gates ingress only; the job''s own enabled flag gates its schedule. A disabled trigger answers 404, the same as an unknown token.';
COMMENT ON COLUMN scheduled_agent_job_webhook_triggers.rotated_at IS 'When the token and secret were last replaced together; NULL for a trigger never rotated.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_agent_job_webhook_triggers_job_fkey') THEN
    ALTER TABLE scheduled_agent_job_webhook_triggers ADD CONSTRAINT scheduled_agent_job_webhook_triggers_job_fkey
      FOREIGN KEY (scheduled_agent_job_id) REFERENCES scheduled_agent_jobs (id) ON DELETE CASCADE;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_scheduled_agent_job_webhook_triggers_updated_at ON scheduled_agent_job_webhook_triggers;

CREATE TRIGGER update_scheduled_agent_job_webhook_triggers_updated_at
  BEFORE UPDATE ON scheduled_agent_job_webhook_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS scheduled_agent_job_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    trigger_id UUID NOT NULL,
    scheduled_agent_job_id UUID NOT NULL,
    run_id UUID NULL,
    status TEXT NOT NULL,
    reject_reason TEXT NULL,
    http_status INTEGER NOT NULL,
    dedupe_key TEXT NULL,
    body_bytes INTEGER NOT NULL DEFAULT 0,
    body_sha256 TEXT NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    rendered_prompt TEXT NULL,
    filter_index INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_scheduled_agent_job_webhook_deliveries_status CHECK (
        status IN ('accepted', 'deduplicated', 'filtered', 'coalesced', 'rejected', 'rate_limited', 'queue_full')
    ),
    CONSTRAINT chk_scheduled_agent_job_webhook_deliveries_reject_reason CHECK (
        reject_reason IS NULL OR reject_reason IN (
            'bad_signature', 'stale_timestamp', 'missing_timestamp', 'invalid_json',
            'unsupported_media_type', 'payload_too_large'
        )
    )
);

COMMENT ON TABLE scheduled_agent_job_webhook_deliveries IS 'OpenThrottle append-only log of every webhook request that matched a trigger, rejections included, so the UI can answer why a webhook did not run. Raw bodies are never stored, only their size and sha256. Rows older than 7 days are purged by the data-retention sweep.';

COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.trigger_id IS 'The webhook trigger the request matched. Requests whose token matches no trigger are logged, not stored.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.scheduled_agent_job_id IS 'Denormalised job id so a job''s delivery log reads without joining the trigger.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.run_id IS 'The run this delivery started (accepted) or was folded into (coalesced); NULL otherwise. ON DELETE SET NULL: purging an old run keeps its delivery row.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.status IS 'accepted | deduplicated | filtered | coalesced | rejected | rate_limited | queue_full. rejected carries a reject_reason.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.reject_reason IS 'Why a rejected delivery was refused: bad_signature | stale_timestamp | missing_timestamp | invalid_json | unsupported_media_type | payload_too_large. NULL for every other status.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.http_status IS 'The HTTP status the sender was answered with.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.dedupe_key IS 'The sender delivery id, else the sha256 of the body; NULL when the request was rejected before the key was computed. Unique per trigger among accepted and coalesced rows.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.body_bytes IS 'Size of the raw request body in bytes.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.body_sha256 IS 'Hex sha256 of the raw request body.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.headers IS 'Allow-listed request headers only (delivery id, timestamp, event name, user agent, content type); never the signature or authorization.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.rendered_prompt IS 'The exact prompt the run was started with (already redacted), shown in the delivery log; NULL when nothing was rendered.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.filter_index IS 'Zero-based index of the filter that excluded a filtered delivery; NULL otherwise.';
COMMENT ON COLUMN scheduled_agent_job_webhook_deliveries.created_at IS 'When the request was received.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_agent_job_webhook_deliveries_trigger_fkey') THEN
    ALTER TABLE scheduled_agent_job_webhook_deliveries ADD CONSTRAINT scheduled_agent_job_webhook_deliveries_trigger_fkey
      FOREIGN KEY (trigger_id) REFERENCES scheduled_agent_job_webhook_triggers (id) ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_agent_job_webhook_deliveries_run_fkey') THEN
    ALTER TABLE scheduled_agent_job_webhook_deliveries ADD CONSTRAINT scheduled_agent_job_webhook_deliveries_run_fkey
      FOREIGN KEY (run_id) REFERENCES scheduled_agent_job_runs (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_webhook_deliveries_trigger_received
  ON scheduled_agent_job_webhook_deliveries (trigger_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_webhook_deliveries_job_received
  ON scheduled_agent_job_webhook_deliveries (scheduled_agent_job_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_agent_job_webhook_deliveries_dedupe
  ON scheduled_agent_job_webhook_deliveries (trigger_id, dedupe_key)
  WHERE status IN ('accepted', 'coalesced') AND dedupe_key IS NOT NULL;

ALTER TABLE scheduled_agent_job_runs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_job_runs_trigger;

ALTER TABLE scheduled_agent_job_runs
    ADD CONSTRAINT chk_scheduled_agent_job_runs_trigger CHECK (
        trigger IN ('schedule', 'manual', 'resume', 'webhook')
    );

COMMENT ON COLUMN scheduled_agent_job_runs.trigger IS 'schedule = cron fire; manual = run-now; resume = the delayed continuation of a usage_limited run (see resume_of_run_id); webhook = an accepted delivery to the job''s webhook trigger (see scheduled_agent_job_webhook_deliveries.run_id).';
