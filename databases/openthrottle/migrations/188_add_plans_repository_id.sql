-- Promote a plan's repository link to a real plans.repository_id column
-- (OT plan 4f4ef365 — rules hierarchy).
--
-- A plan's repository lived only inside run_config -> 'workspace' ->> 'repositoryId' (JSONB),
-- so neither the plan-rules worker nor SQL could match or filter on it cleanly. Repository-scoped
-- tag→action rules need a real column.
--
-- Single writer: the column is DERIVED from run_config by a BEFORE INSERT / UPDATE OF run_config
-- trigger, never written by a client. Every path that saves a plan (the server's create and
-- updatePlan, task promotion, the node client, raw SQL) therefore keeps the two in step; the ORM
-- maps the column read-only. The derivation only keeps a value that is a UUID naming an existing
-- repositories row and leaves anything else NULL, so a stale or malformed run config never fails
-- a plan save on the foreign key.
--
-- The trigger also fires on a direct UPDATE OF repository_id and re-derives it, so a hand-written
-- value cannot stick. That includes ON DELETE SET NULL: the referential action runs after the
-- repository row is gone, so the re-derivation resolves to NULL as intended.
--
-- Idempotent: re-running re-creates the function and trigger and re-runs the backfill, which only
-- writes rows whose derived value differs.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS repository_id UUID NULL;

-- The foreign key gets its own pg_constraint-guarded statement: inline REFERENCES inside the
-- IF NOT EXISTS above would be skipped whole if the column already existed (see
-- databases/openthrottle/README.md § Foreign keys in migrations).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_repository_id_fkey'
  ) THEN
    ALTER TABLE plans
      ADD CONSTRAINT plans_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_plans_repository_id ON plans (repository_id);

COMMENT ON COLUMN plans.repository_id IS
  'The repository this plan runs in (repositories.id), derived from run_config -> workspace -> repositoryId by the trg_plans_derive_repository_id trigger; NULL when the run config names none, a non-UUID, or a repository that does not exist. Never written directly. SET NULL when the repository is deleted. Matched by repository-scoped tag_action_rules.';

CREATE OR REPLACE FUNCTION plans_derive_repository_id(run_config JSONB)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  candidate TEXT := run_config -> 'workspace' ->> 'repositoryId';
BEGIN
  IF candidate IS NULL
    OR candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN (SELECT r.id FROM repositories r WHERE r.id = candidate::uuid);
END;
$$;

COMMENT ON FUNCTION plans_derive_repository_id(JSONB) IS
  'Derives plans.repository_id from a plan run_config: the workspace.repositoryId when it is a UUID naming an existing repositories row, otherwise NULL.';

CREATE OR REPLACE FUNCTION plans_set_repository_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.repository_id := plans_derive_repository_id(NEW.run_config);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION plans_set_repository_id() IS
  'Trigger function for trg_plans_derive_repository_id: keeps plans.repository_id in step with run_config on every insert and run_config update.';

DROP TRIGGER IF EXISTS trg_plans_derive_repository_id ON plans;

CREATE TRIGGER trg_plans_derive_repository_id
  BEFORE INSERT OR UPDATE OF run_config, repository_id ON plans
  FOR EACH ROW
  EXECUTE FUNCTION plans_set_repository_id();

-- Backfill existing plans (the trigger re-derives the same value on this UPDATE).
UPDATE plans
SET repository_id = plans_derive_repository_id(run_config)
WHERE repository_id IS DISTINCT FROM plans_derive_repository_id(run_config);
