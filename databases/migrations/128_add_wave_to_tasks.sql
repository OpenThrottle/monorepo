-- Add a nullable wave grouping to tasks (OT plan c22e5ba1, task 3).
--
-- A wave is a coarse layer, not a dependency graph: it is the plan's claim that
-- the tasks sharing a wave number MAY be worked concurrently. NULL means
-- unassigned -- never wave zero -- so the CHECK constraint below makes that
-- unambiguous at the schema level. Waves number densely from 1, with no
-- reserved gaps (unlike sort_order's 1000-wide strides): there is no unique
-- constraint on wave, so there is no mid-list-insert pressure that gaps would
-- buy back.
--
-- sort_order (migration 049) is untouched and remains the canonical execution
-- and list order; wave only groups a sort_order sequence, it never resequences
-- it. See docs/openthrottle/task-wave-encoding.md for the full contract,
-- including why this is a layer and not a `depends_on` array or a task_tags
-- dimension, and why nothing consumes this column yet.
--
-- Idempotent: re-running adds nothing new and changes nothing else.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS wave INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_wave_positive'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT chk_tasks_wave_positive
      CHECK (wave IS NULL OR wave >= 1);
  END IF;
END
$$;

COMMENT ON COLUMN tasks.wave IS
  'Coarse concurrency layer within a plan, nullable. NULL means unassigned (runs alone, in sort_order position) -- never wave zero. Tasks sharing a wave number are the author''s claim that they may be worked concurrently; sort_order remains the canonical order and the tiebreaker within a wave. No UNIQUE constraint: several tasks sharing a wave is the point. Hook tasks (hook_role non-NULL) always stay NULL. Not consumed by the executor yet -- see docs/openthrottle/task-wave-encoding.md.';
