-- Give the batch 11 tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 11 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan c0d57382-ec90-481f-ac2a-13cd57099cea).
--
--   plan_tags, task_tags, project_tags, rule_applications → BaseHardDeleteModel: uuidv7 `id`
--                                                           default
--   project_skills, skill_availability_rule_sets,
--   skill_availability_rules, tag_action_rules            → BaseModel: `deleted_at` + uuidv7
--                                                           `id` default
--   custom_prompts                                        → BaseModel: already has
--                                                           `deleted_at` (036); uuidv7 `id`
--                                                           default + column comment
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7. Every table here
-- already has `created_at` and `updated_at` with its update_*_updated_at trigger, and keeps
-- them.
--
-- The tag join tables are attach/detach rows and rule_applications is the apply-once ledger,
-- so a delete of any of them stays a hard DELETE: a detached tag is simply re-attached, and a
-- ledger row is never user-deleted.
--
-- project_skills, the skill availability rule sets and rules, and tag_action_rules are
-- created and deleted by a user (or the ingest), so a delete becomes a soft delete. A soft
-- delete fires none of the foreign key actions, so (enforced in the repositories, not here):
--
--   * soft-deleting a rule set soft deletes its live rules in the same transaction (was
--     skill_availability_rules ON DELETE CASCADE);
--   * soft-deleting a tag-action rule keeps its rule_applications ledger rows, which are
--     reachable only through the live rule.
--
-- The unique keys on project_skills (project_id, slug) and skill_availability_rule_sets
-- (project_id) become unique among live rows only, so re-ingesting a removed skill or
-- recreating a project's rule set never collides with a soft-deleted row.
--
-- custom_prompts keeps idx_custom_prompts_file_path_prompt_type over ALL rows on purpose:
-- the agent-asset ingest upserts ON CONFLICT (file_path, prompt_type) and revives a
-- soft-deleted prompt by clearing its `deleted_at`, which needs the conflict to see
-- soft-deleted rows.

-- ---------------------------------------------------------------------------
-- plan_tags, task_tags, project_tags (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already have `id`, `created_at` and `updated_at` with their triggers (064, 070).

ALTER TABLE plan_tags ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE task_tags ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE project_tags ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- rule_applications (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (066). Its state is
-- written in place (applied → orphaned), so it keeps `updated_at`.

ALTER TABLE rule_applications ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- project_skills (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (061).

ALTER TABLE project_skills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN project_skills.deleted_at IS
  'When this project skill was soft deleted (explicitly removed); NULL for live rows. Distinct from orphaned_at, which ingest sets when the slug vanishes from disk. A soft-deleted row frees its (project_id, slug) for a live row.';

ALTER TABLE project_skills ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE project_skills DROP CONSTRAINT IF EXISTS uq_project_skills_project_slug;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_skills_project_slug_live
  ON project_skills (project_id, slug)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- skill_availability_rule_sets (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (062).

ALTER TABLE skill_availability_rule_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN skill_availability_rule_sets.deleted_at IS
  'When this rule set was soft deleted; NULL for the live rule set. A soft-deleted rule set frees its project_id for a live one.';

ALTER TABLE skill_availability_rule_sets ALTER COLUMN id SET DEFAULT uuidv7();

ALTER TABLE skill_availability_rule_sets DROP CONSTRAINT IF EXISTS uq_skill_availability_rule_sets_project;

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_availability_rule_sets_project_live
  ON skill_availability_rule_sets (project_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN skill_availability_rule_sets.project_id IS
  'Owning project (projects.id); cascade-deleted with the project. Unique among live rows — at most one live rule set per project.';

-- ---------------------------------------------------------------------------
-- skill_availability_rules (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (062).

ALTER TABLE skill_availability_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN skill_availability_rules.deleted_at IS
  'When this rule was soft deleted (directly, or with its rule set); NULL for live rules.';

ALTER TABLE skill_availability_rules ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- tag_action_rules (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` with its trigger (065).

ALTER TABLE tag_action_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN tag_action_rules.deleted_at IS
  'When this rule was soft deleted; NULL for live rules. A soft-deleted rule no longer evaluates and keeps its rule_applications ledger rows.';

ALTER TABLE tag_action_rules ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- custom_prompts (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at`, `updated_at` with its trigger, and `deleted_at` (036).

COMMENT ON COLUMN custom_prompts.deleted_at IS
  'When this prompt was soft deleted (reaped by ingest when its file vanished); NULL for live prompts. Re-ingesting the same (file_path, prompt_type) revives the row.';

ALTER TABLE custom_prompts ALTER COLUMN id SET DEFAULT uuidv7();
