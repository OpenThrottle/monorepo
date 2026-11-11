-- Agent trajectories: an optional idempotency key so a re-sent upload is a no-op.
--
-- A Stop-hook upload can reach the server twice: a buffered retry plus a manual
-- `--replay-dead-letter`, or a re-upload after the per-session state file was swept. The client
-- derives a deterministic key per segment (session_upload: `session:<sessionId>:<toolUseId>`;
-- spawned: `spawned:<planRunId>:<iteration>`), and recordAgentTrajectory returns the existing row
-- for a key it has already stored. The index is partial because the key is optional: rows
-- recorded without one (older clients) never conflict.

ALTER TABLE agent_trajectories ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

COMMENT ON COLUMN agent_trajectories.idempotency_key IS 'Optional client-derived key that makes recording this trajectory idempotent: session_upload keys are session:<sessionId>:<toolUseId>, spawned keys are spawned:<planRunId>:<iteration>. NULL for rows recorded without one. Unique where not NULL (uq_agent_trajectories_idempotency_key).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_trajectories_idempotency_key
    ON agent_trajectories (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
