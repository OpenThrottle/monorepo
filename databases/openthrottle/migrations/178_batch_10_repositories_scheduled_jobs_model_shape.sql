-- Give the batch 10 tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 10 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan a097bdcd-2dc6-497f-b9c5-2b25c094fa17).
--
--   repositories, repository_checkouts, scheduled_agent_jobs → BaseModel: `deleted_at`
--                                                              + uuidv7 `id` default
--   scheduled_agent_job_runs                                 → BaseHardDeleteModel: uuidv7
--                                                              `id` default
--   user_preferences, user_workspace_settings                → natural key (`user_id`),
--                                                              no change
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
--
-- Repositories, checkouts and scheduled jobs are created and deleted by a user, so a
-- delete becomes a soft delete. A soft delete fires none of the foreign key actions, so
-- the cascades these tables relied on move into the repositories:
--
--   * deleting a repository soft deletes its live checkouts (was ON DELETE CASCADE);
--   * deleting a checkout no longer nulls plan_runs / scheduled_agent_jobs /
--     scheduled_agent_job_runs / worktree_removals references (was ON DELETE SET NULL):
--     those rows keep pointing at the soft-deleted checkout, which reads as not found;
--   * deleting a scheduled job keeps its run history (was ON DELETE CASCADE).
--
-- Each table's unique key becomes unique among live rows only, so re-registering a
-- deleted checkout path, re-detecting a deleted repository's remote or recreating a job
-- with the same scheduler key never collides with a soft-deleted row.
--
-- scheduled_agent_job_runs are history: a run is never user-deleted, and its status is
-- written in place by the processor. It has no `updated_at` (082) and gains none.

-- ---------------------------------------------------------------------------
-- repositories (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (078).

ALTER TABLE repositories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN repositories.deleted_at IS
  'When this repository was soft deleted; NULL for live repositories. A soft-deleted row frees its normalized remote URL for a live row.';

ALTER TABLE repositories ALTER COLUMN id SET DEFAULT uuidv7();

DROP INDEX IF EXISTS uq_repositories_normalized_remote_url;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repositories_normalized_remote_url_live
  ON repositories (normalized_remote_url)
  WHERE normalized_remote_url IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- repository_checkouts (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (078).

ALTER TABLE repository_checkouts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN repository_checkouts.deleted_at IS
  'When this checkout was soft deleted (unregistered, or its repository deleted); NULL for live checkouts. A soft-deleted row frees its (user_id, filesystem_path) for a live row.';

ALTER TABLE repository_checkouts ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE repository_checkouts DROP CONSTRAINT IF EXISTS uq_repository_checkouts_user_path;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repository_checkouts_user_path_live
  ON repository_checkouts (user_id, filesystem_path)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- scheduled_agent_jobs (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (082).

ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN scheduled_agent_jobs.deleted_at IS
  'When this scheduled job was soft deleted; NULL for live jobs. A soft-deleted job keeps its run history and frees its scheduler key for a live job.';

ALTER TABLE scheduled_agent_jobs ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE scheduled_agent_jobs DROP CONSTRAINT IF EXISTS uq_scheduled_agent_jobs_scheduler_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_agent_jobs_scheduler_key_live
  ON scheduled_agent_jobs (scheduler_key)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- scheduled_agent_job_runs (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (082).

ALTER TABLE scheduled_agent_job_runs ALTER COLUMN id SET DEFAULT uuidv7();
