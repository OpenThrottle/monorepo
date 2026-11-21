-- Repository rung for tag→action rules (OT plan 4f4ef365 — rules hierarchy).
--
-- A rule can now be scoped to one repository: tag_action_rules.repository_id is matched against
-- plans.repository_id (migration 188) by the plan-rules worker. NULL keeps the rule matching every
-- repository. project_id stays in place, reserved for the future cross-repo Project model.
--
-- Idempotent: re-running is a no-op apart from refreshing the comments.

ALTER TABLE tag_action_rules ADD COLUMN IF NOT EXISTS repository_id UUID NULL;

-- The foreign key gets its own pg_constraint-guarded statement: inline REFERENCES inside the
-- IF NOT EXISTS above would be skipped whole if the column already existed (see
-- databases/openthrottle/README.md § Foreign keys in migrations).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tag_action_rules_repository_id_fkey'
  ) THEN
    ALTER TABLE tag_action_rules
      ADD CONSTRAINT tag_action_rules_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tag_action_rules_repository_id ON tag_action_rules (repository_id);

COMMENT ON COLUMN tag_action_rules.repository_id IS
  'Optional repository scope (repositories.id): NULL matches plans in every repository; a value restricts the rule to plans whose plans.repository_id equals it. CASCADE on repository deletion drops the rule, because widening a repository-scoped rule to every repository would be wrong.';

COMMENT ON COLUMN tag_action_rules.project_id IS
  'Reserved for cross-repo Projects (initiatives spanning many repositories). Still matched against plans.project_id when set, but never scored for precedence and not offered by the rule form; use repository_id to scope a rule. SET NULL on project deletion widens the rule rather than dropping it.';
