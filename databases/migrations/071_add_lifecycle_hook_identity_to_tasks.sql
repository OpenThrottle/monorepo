-- Lifecycle-hook identity on tasks: promote before/after hooks to first-class,
-- one-level-nested tasks on BOTH plans and tasks (the Jest surface). A hook is a
-- real task row carrying a marker so consumers can identify and separate it from
-- regular tasks:
--   hook_role NULL                          -> regular task
--   hook_role set + parent_task_id NULL     -> plan-level hook (beforeAll/afterAll;
--                                              hook_scope='each' expands per-task =
--                                              beforeEach/afterEach)
--   hook_role set + parent_task_id set      -> task-level before/after hook
-- Hook body is either an inline template (hook_source='template') or a skill
-- reference (hook_source='skill' + skill_slug). One level of nesting only — a
-- hook task must not itself parent another hook; that invariant is enforced in
-- TasksService (a pure SQL CHECK cannot see the parent's role).
-- See docs/monorepo/lifecycle-hooks-design.md ("Data model").

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hook_role TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hook_scope TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hook_source TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS skill_slug TEXT;

-- Self-referential parent FK (cascade so deleting an anchor removes its hooks).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_parent_task_id'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT fk_tasks_parent_task_id
      FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_role'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_role
      CHECK (hook_role IS NULL OR hook_role IN ('before', 'after'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_scope'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_scope
      CHECK (hook_scope IS NULL OR hook_scope IN ('once', 'each'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_source'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_source
      CHECK (hook_source IS NULL OR hook_source IN ('template', 'skill'));
  END IF;

  -- skill_slug is set iff the hook body is a skill.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_skill_slug'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_skill_slug
      CHECK (
        (hook_source = 'skill' AND skill_slug IS NOT NULL)
        OR (hook_source IS DISTINCT FROM 'skill' AND skill_slug IS NULL)
      );
  END IF;

  -- 'each' expansion is plan-scoped by definition (no anchor task).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_each_plan_scoped'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_each_plan_scoped
      CHECK (hook_scope IS DISTINCT FROM 'each' OR parent_task_id IS NULL);
  END IF;

  -- A regular task (hook_role NULL) carries none of the hook fields.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_hook_role_coherence'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_hook_role_coherence
      CHECK (
        hook_role IS NOT NULL
        OR (
          parent_task_id IS NULL
          AND hook_scope IS NULL
          AND hook_source IS NULL
          AND skill_slug IS NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks (parent_task_id);

COMMENT ON COLUMN tasks.parent_task_id IS 'Anchor task for a task-level lifecycle hook (self-FK, ON DELETE CASCADE). NULL for regular tasks and for plan-level hooks. See docs/monorepo/lifecycle-hooks-design.md.';

COMMENT ON COLUMN tasks.hook_role IS 'Lifecycle-hook marker: NULL = regular task; ''before''/''after'' = a hook task. With parent_task_id NULL it is a plan-level hook (beforeAll/afterAll, or beforeEach/afterEach when hook_scope=''each''); with parent_task_id set it is a per-task hook.';

COMMENT ON COLUMN tasks.hook_scope IS 'Plan-level hook expansion mode: ''once'' runs a single time (beforeAll/afterAll); ''each'' expands onto every task at run start (beforeEach/afterEach). Only valid when parent_task_id IS NULL. NULL for regular tasks and task-level hooks.';

COMMENT ON COLUMN tasks.hook_source IS 'How a hook task''s body is produced: ''template'' (inline title/description) or ''skill'' (references skill_slug, executed via the job-run-hooks runner). NULL for regular tasks.';

COMMENT ON COLUMN tasks.skill_slug IS 'Kebab-case skill slug when hook_source=''skill'' (the validation/prompt skill the hook runs); NULL otherwise. Enforced by chk_tasks_hook_skill_slug.';
