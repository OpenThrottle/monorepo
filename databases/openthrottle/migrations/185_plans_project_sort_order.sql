-- Ordered plan membership in a project.
--
-- A plan belongs to at most one project (plans.project_id). A project is an initiative whose
-- plans are worked in a deliberate order, so each membership carries a gap-based position,
-- like tasks.sort_order (1000, 2000, ...): a plan can be dropped between two others without
-- renumbering. The position is NULL exactly when the plan has no project.
--
-- Unique per project among live plans, so two live plans never share a slot. A soft-deleted
-- plan keeps its stale position without holding the slot.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS project_sort_order INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_project_id_project_sort_order
  ON plans (project_id, project_sort_order)
  WHERE project_sort_order IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN plans.project_sort_order IS 'Position of the plan within its project, gap-based like tasks.sort_order (1000, 2000, ...). NULL when the plan has no project (project_id IS NULL). Unique per project among live plans (uq_plans_project_id_project_sort_order). Assigned by the server when project_id is set, cleared when it is unset.';

-- Backfill: live plans that already have a project, numbered per project by creation order.
-- Only rows still without a position are touched, so re-running is a no-op.
UPDATE plans p
SET project_sort_order = ranked.position
FROM (
  SELECT id, (row_number() OVER (PARTITION BY project_id ORDER BY created_at, id))::int * 1000 AS position
  FROM plans
  WHERE project_id IS NOT NULL
    AND deleted_at IS NULL
) ranked
WHERE p.id = ranked.id
  AND p.project_sort_order IS NULL;
