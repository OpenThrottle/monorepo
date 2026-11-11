-- Mark project_skills rows that were ingested but are no longer on disk.
-- Ingest must not DELETE those rows (tags live on the record). Reconcile sets
-- orphaned_at when the slug is absent from the current walk and clears it when
-- the skill reappears. Explicit removeProjectSkill deletes one row.

ALTER TABLE project_skills
  ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN project_skills.orphaned_at IS 'Set when agent-asset ingest no longer finds this slug on disk; NULL while the skill is present. OpenThrottle does not auto-delete the row — tags stay on the record until an explicit remove.';
