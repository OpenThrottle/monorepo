-- Give the batch 7 core planning tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 7 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan f89ee499-691c-4872-b661-774e25eb73f6).
--
--   projects, plans, tasks                      → BaseModel: `deleted_at` + uuidv7 `id` default
--   plan_embeddings, task_embeddings,
--   plan_output_stream                          → BaseHardDeleteModel: uuidv7 `id` default only
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7. The
-- update_*_updated_at triggers stay.
--
-- DELETE SEMANTICS CHANGE. Until now a delete of a plan, task or project was a hard DELETE,
-- and the foreign keys did the rest: a plan's tasks, runs, output, embeddings, tags,
-- messages, rule applications and work-session subjects were CASCADE-deleted; a project's
-- plans/tasks/repositories had project_id SET NULL. A soft delete is an UPDATE, so none of
-- those FK actions fire any more. What happens instead (enforced in the repositories, not
-- here):
--
--   * Soft-deleting a plan soft-deletes its tasks in the same transaction, because tasks
--     have list paths of their own (by category, by status, semantic search) that would
--     otherwise surface orphans.
--   * Soft-deleting a task soft-deletes its child tasks (hooks and subtasks, parent_task_id)
--     in the same transaction, mirroring the old parent_task_id CASCADE.
--   * Every other child row (plan_runs, plan_output_stream, plan/task embeddings, plan_tags,
--     task_tags, plan_messages, rule_applications, work_session_subjects) is left in place.
--     It is reachable only through its live parent; raw SQL that reads it without going
--     through the parent joins the parent and filters `deleted_at IS NULL`.
--   * Soft-deleting a project leaves project_id on its plans, tasks and repositories. The
--     project lookup filters live rows, so the link reads as "no project" — the same answer
--     the old SET NULL gave — and survives an undelete.
--
-- The FKs keep their CASCADE / SET NULL actions: a later purge of soft-deleted rows (a hard
-- DELETE) still cleans up exactly as before.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN projects.deleted_at IS
  'When this project was soft deleted; NULL for live projects. Plans and tasks keep their project_id; the link reads as no project while this is set.';

ALTER TABLE projects ALTER COLUMN id SET DEFAULT uuidv7();

-- A soft-deleted project must not block reusing its Nx project name.
DROP INDEX IF EXISTS idx_projects_nx_project_name_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_nx_project_name_live
  ON projects (nx_project_name)
  WHERE nx_project_name IS NOT NULL AND deleted_at IS NULL;

DROP INDEX IF EXISTS idx_projects_created_at;

CREATE INDEX IF NOT EXISTS idx_projects_live_created_at
  ON projects (created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------

ALTER TABLE plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN plans.deleted_at IS
  'When this plan was soft deleted; NULL for live plans. Soft-deleting a plan soft-deletes its tasks; its runs, output, embeddings, tags and messages stay in place, unreachable through the deleted plan.';

ALTER TABLE plans ALTER COLUMN id SET DEFAULT uuidv7();

-- The plan lists (by status, newest created or updated first) read live rows only.
DROP INDEX IF EXISTS idx_plans_status_created_at;

CREATE INDEX IF NOT EXISTS idx_plans_live_status_created_at
  ON plans (status, created_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_plans_status_updated_at;

CREATE INDEX IF NOT EXISTS idx_plans_live_status_updated_at
  ON plans (status, updated_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_plans_created_at;

CREATE INDEX IF NOT EXISTS idx_plans_live_created_at
  ON plans (created_at DESC)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_plans_updated_at;

CREATE INDEX IF NOT EXISTS idx_plans_live_updated_at
  ON plans (updated_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN tasks.deleted_at IS
  'When this task was soft deleted; NULL for live tasks. Set together with its plan''s, and cascaded to its child tasks (parent_task_id).';

ALTER TABLE tasks ALTER COLUMN id SET DEFAULT uuidv7();

-- (plan_id, sort_order) is unique among live tasks only, so a soft-deleted task never blocks
-- inserting or reordering into its slot. It also serves the per-plan ordered task list.
DROP INDEX IF EXISTS idx_tasks_plan_id_sort_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_plan_id_sort_order_live
  ON tasks (plan_id, sort_order)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_tasks_status;

CREATE INDEX IF NOT EXISTS idx_tasks_live_status
  ON tasks (status)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- plan_embeddings, task_embeddings, plan_output_stream (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Derived or append-only rows: a delete is real. They already have `id` and `created_at`.

ALTER TABLE plan_embeddings ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE task_embeddings ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE plan_output_stream ALTER COLUMN id SET DEFAULT uuidv7();
