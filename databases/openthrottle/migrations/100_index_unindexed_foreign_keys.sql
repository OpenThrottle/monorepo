-- Index every foreign-key column that has no supporting index
-- (OT plan 70239a50, tasks 83349595 / 2b48e7c4 / 3d54472a).
--
-- Postgres creates an index for a PRIMARY KEY or UNIQUE constraint but never for
-- a FOREIGN KEY. The parent side is indexed by definition; the CHILD side is not,
-- so both of these degrade to a sequential scan over the child table:
--   * the application's own `WHERE <fk_column> = $1` lookups, and
--   * the referential-integrity check Postgres runs on every parent DELETE or
--     key UPDATE, which must prove no child still references the row.
-- The second is the one that bites: as the child table grows, deleting a single
-- parent row gets linearly slower and holds its lock for longer.
--
-- A catalog audit (pg_constraint single-column FKs with no index whose leading
-- column matches) found exactly four such columns; all four are covered below.
-- Verified before/after with EXPLAIN on the local database.
--
-- Partial `WHERE ... IS NOT NULL` predicates: all four columns are nullable and
-- the index is only ever probed for a concrete id, so `col = $1` implies
-- NOT NULL and the planner can still use the partial index. This keeps the index
-- off rows that can never match -- notably agent_conversations.project_id, where
-- almost every row is currently NULL.
--
-- agent_conversations.project_id is included even though it holds no non-NULL
-- rows on the audited database. It is a real unindexed FK on a table that grows
-- with every chat conversation, and leaving one known gap behind so a future
-- audit re-reports it is not worth the saved kilobyte.

CREATE INDEX IF NOT EXISTS idx_agent_token_usage_message_id
  ON agent_token_usage (message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_runs_repository_checkout_id
  ON scheduled_agent_job_runs (repository_checkout_id)
  WHERE repository_checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_project_id
  ON repositories (project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_conversations_project_id
  ON agent_conversations (project_id)
  WHERE project_id IS NOT NULL;
