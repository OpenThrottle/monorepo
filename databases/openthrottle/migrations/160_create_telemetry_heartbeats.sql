-- Coverage heartbeat storage (docs/monorepo/child-repo-hook-telemetry-contract.md §8).
--
-- One row per (user, machine, repo identity, delivery leg, source), upserted latest-wins by the
-- recordTelemetryHeartbeat mutation on every Claude Code SessionStart. The table therefore stays
-- small without a pruning job: a machine opening the same repo a thousand times is one row with a
-- moving last_seen_at.
--
-- Idempotent: table and indexes are IF NOT EXISTS; the FK is added in its own pg_constraint-guarded
-- statement (an inline REFERENCES under IF NOT EXISTS can silently never land).
-- NULLS NOT DISTINCT (PostgreSQL 15+) makes a NULL repo_identity collide with itself, so a machine
-- with no git remote is still one row rather than one per session.

CREATE TABLE IF NOT EXISTS telemetry_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    machine_id TEXT NOT NULL,
    machine_label TEXT,
    source TEXT NOT NULL,
    delivery_leg TEXT NOT NULL,
    repo_identity TEXT,
    plugin_version TEXT,
    marketplace_plugin_installed BOOLEAN,
    marketplace_plugin_version TEXT,
    buffered_events INTEGER NOT NULL DEFAULT 0,
    buffered_outcomes INTEGER NOT NULL DEFAULT 0,
    buffered_token_usage INTEGER NOT NULL DEFAULT 0,
    buffered_trajectories INTEGER NOT NULL DEFAULT 0,
    dead_letter_count INTEGER NOT NULL DEFAULT 0,
    oldest_buffered_at TIMESTAMP WITH TIME ZONE,
    recent_buffered_totals INTEGER[] NOT NULL DEFAULT '{}',
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT telemetry_heartbeats_delivery_leg_check
        CHECK (delivery_leg IN ('repo', 'plugin-dir', 'marketplace')),
    CONSTRAINT telemetry_heartbeats_key_unique
        UNIQUE NULLS NOT DISTINCT (user_id, machine_id, repo_identity, delivery_leg, source)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telemetry_heartbeats_user_id_fkey') THEN
    ALTER TABLE telemetry_heartbeats ADD CONSTRAINT telemetry_heartbeats_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_telemetry_heartbeats_user_last_seen
    ON telemetry_heartbeats (user_id, last_seen_at DESC);

COMMENT ON TABLE telemetry_heartbeats IS 'Per-session coverage heartbeat sent by Claude Code SessionStart hooks: which machine, through which delivery leg, in which repo, with what sitting in the local telemetry buffer. Upserted latest-wins on (user_id, machine_id, repo_identity, delivery_leg, source), so one row per machine+repo+leg with a moving last_seen_at and no pruning job. Lets /usage tell "nobody ran a skill" from "nobody was listening" (missing marketplace plugin, stale or growing buffer, silent machine). Carries counts and timestamps only: never email, hostname, absolute paths, tokens, skill names or args. Contract: docs/monorepo/child-repo-hook-telemetry-contract.md section 8.';

COMMENT ON COLUMN telemetry_heartbeats.id IS 'Surrogate primary key.';

COMMENT ON COLUMN telemetry_heartbeats.user_id IS 'Human user the heartbeat is attributed to, resolved server-side from the authenticated principal (a service account via its acting_user_id); never accepted from the client. NOT NULL: a heartbeat with no attributable user is rejected rather than stored anonymously. FK users(id).';

COMMENT ON COLUMN telemetry_heartbeats.machine_id IS 'Opaque random UUID string generated once on the client into ~/.openthrottle/machine-id. Carries no information about the machine; a hostname hash was rejected because hostnames come from a guessable space. Max 64 chars, enforced by the resolver.';

COMMENT ON COLUMN telemetry_heartbeats.machine_label IS 'Operator-chosen label (OPENTHROTTLE_MACHINE_LABEL), opt-in, so the UI can show "work laptop" instead of the machine id. NULL when not set; never defaulted from the hostname.';

COMMENT ON COLUMN telemetry_heartbeats.source IS 'Harness that sent the heartbeat, matching the source on skill usage events (e.g. claude-code). Part of the upsert key.';

COMMENT ON COLUMN telemetry_heartbeats.delivery_leg IS 'How the capture hooks reached the session: repo (the repository''s own settings), plugin-dir (a --plugin-dir load) or marketplace (the installed marketplace plugin). A fact about the install, not the user''s work. CHECK-constrained; part of the upsert key.';

COMMENT ON COLUMN telemetry_heartbeats.repo_identity IS 'Normalized https git remote of the session''s repository (e.g. https://github.com/org/repo), normalized client-side and again server-side with normalizeRemoteUrl. NULL when the checkout has no usable remote; never a filesystem path. Part of the upsert key (NULLS NOT DISTINCT).';

COMMENT ON COLUMN telemetry_heartbeats.plugin_version IS 'Version from the running payload''s plugin.json, so /usage can flag an outdated install. NULL for the repo leg, which has no plugin payload.';

COMMENT ON COLUMN telemetry_heartbeats.marketplace_plugin_installed IS 'Whether the openthrottle@openthrottle marketplace plugin is installed on the machine, read from installed_plugins.json. NULL means unknown. FALSE on a repo or plugin-dir heartbeat is the MANUAL_SESSIONS_UNCOVERED signal.';

COMMENT ON COLUMN telemetry_heartbeats.marketplace_plugin_version IS 'Installed marketplace plugin version when marketplace_plugin_installed is true; otherwise NULL. Compared with the payload version the server ships to raise PLUGIN_OUTDATED.';

COMMENT ON COLUMN telemetry_heartbeats.buffered_events IS 'Line count of the local skill-usage events buffer at heartbeat time. A count only; no record content.';

COMMENT ON COLUMN telemetry_heartbeats.buffered_outcomes IS 'Line count of the local skill-usage outcomes buffer at heartbeat time.';

COMMENT ON COLUMN telemetry_heartbeats.buffered_token_usage IS 'Line count of the local token-usage buffer at heartbeat time.';

COMMENT ON COLUMN telemetry_heartbeats.buffered_trajectories IS 'Line count of the local trajectories buffer at heartbeat time.';

COMMENT ON COLUMN telemetry_heartbeats.dead_letter_count IS 'Total records across the local dead-letter files (records the server rejected on drain). Non-zero while the heartbeat itself arrives usually means the server is rejecting records.';

COMMENT ON COLUMN telemetry_heartbeats.oldest_buffered_at IS 'Timestamp of the oldest record still buffered locally; NULL when the buffers are empty. Older than 24h raises BUFFER_STALE.';

COMMENT ON COLUMN telemetry_heartbeats.recent_buffered_totals IS 'Total buffered line count (events + outcomes + token usage + trajectories) of this key''s last three heartbeats, oldest first, newest last. Maintained by the upsert; a strictly rising series raises BUFFER_GROWING.';

COMMENT ON COLUMN telemetry_heartbeats.first_seen_at IS 'When this key was first heartbeated. Never updated by the upsert.';

COMMENT ON COLUMN telemetry_heartbeats.last_seen_at IS 'When the latest heartbeat for this key was received (server clock). Advanced by every upsert; drives MACHINE_SILENT.';
