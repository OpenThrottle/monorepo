-- Make artifact idempotency a database fact rather than a convention
-- (OT plan 75e8cd5c, task 2b91a7d5).
--
-- WHY A CONVENTION WILL NOT HOLD
--
-- "Re-running must not duplicate artifacts" is a property the schema cannot
-- currently deliver: uq_work_artifacts_session_type_key is scoped to
-- (session_id, type, external_key), so the same commit under a new session is a
-- new row, and idx_work_artifacts_type_external_key is a plain index, not
-- unique. The trailer harvest runs unattended forever and the settle path
-- writes from every loop, so "be careful not to duplicate" is being asked to
-- hold across concurrent sweeps and every future writer. It already failed at
-- exactly this, at scale: migration 118 had to collapse 983 rows into 198.
--
-- Two alternatives were considered and rejected:
--
--   * Reuse one stable scanner session so the session-scoped constraint bites.
--     This collapses "session = a unit of work" into "session = a scanner
--     identity", contradicting the table's own design, and does nothing about
--     duplicates written by any other caller.
--   * A pre-flight existence check in the write path. Advisory only — two
--     concurrent sweeps race between the SELECT and the INSERT.
--
-- SCOPE OF THE INDEX
--
-- Only the IDEMPOTENT types in artifact-type-registry.ts, where re-reporting the
-- same external_key is meant to upsert. The `event` types are deliberately
-- excluded: status_change derives its external_key with a uuid discriminator
-- appended precisely so every report is a distinct append-only row, and a
-- unique index over those would be both pointless (the uuid makes collision
-- impossible) and wrong in intent.
--
-- The type list is spelled out rather than expressed as "NOT status_change" so
-- that adding a new EVENT type cannot silently acquire a uniqueness constraint
-- that contradicts it. A new idempotent type needs a migration to opt in, which
-- is the safer direction to fail.
--
-- DEPENDS ON 118. This index cannot be created while the 116 duplicated
-- git_commit keys exist. At the time of writing git_commit is the only
-- idempotent type carrying duplicates (plan_promotion 14 rows, pull_request 6,
-- both already unique), so 118 is the whole precondition.
--
-- SIDE BENEFIT: it also fixes measurement. count(*) on git_commit read 1065 for
-- 198 distinct commits — a 5x overcount overall and 67x on the worst single
-- commit — so anything reading this table for git activity was inflated.
--
-- The older session-scoped index is left in place: it is strictly weaker than
-- this one for idempotent types, and still meaningful for event types.
--
-- Idempotent: IF NOT EXISTS, and creating it a second time is a no-op.

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_artifacts_type_external_key
    ON work_artifacts (type, external_key)
    WHERE type IN (
        'deployment',
        'document',
        'git_commit',
        'plan_promotion',
        'pull_request'
    );

COMMENT ON INDEX uq_work_artifacts_type_external_key IS
    'Global idempotency for artifact types whose external_key is a canonical identity (artifact-type-registry.ts ARTIFACT_IDENTITY.IDEMPOTENT): recording the same commit, PR, document, deployment or promotion twice is a no-op regardless of which session reports it. Deliberately excludes event types such as status_change, whose external_key carries a uuid discriminator so every report is a distinct append-only row. Supersedes uq_work_artifacts_session_type_key for these types; that index remains for the event types.';
