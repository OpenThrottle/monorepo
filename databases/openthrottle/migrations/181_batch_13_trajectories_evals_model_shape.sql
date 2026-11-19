-- Give the batch 13 trajectory and eval tables their base-model shapes (@openthrottle/nestjs-postgres).
-- Batch 13 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan 5bda4721-e70b-4e31-8685-2e9d87aad489).
--
--   agent_trajectories       → BaseHardDeleteModel: uuidv7 `id` default
--   eval_datasets            → BaseModel: `deleted_at` + uuidv7 `id` default
--   eval_cases               → BaseModel: `updated_at` + `deleted_at` + uuidv7 `id` default
--   eval_human_labels        → BaseModel: `deleted_at` + uuidv7 `id` default
--   eval_runs                → BaseHardDeleteModel: uuidv7 `id` default
--   eval_trials              → BaseHardDeleteModel: uuidv7 `id` default
--   eval_grades              → BaseHardDeleteModel: uuidv7 `id` default
--   eval_judge_calibrations  → BaseHardDeleteModel: uuidv7 `id` default
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
--
-- Delete semantics (decided in this batch):
--
--   * Trajectories, runs, trials, grades and calibrations are recorded results. They are
--     never user-deleted; the only deletes are FK cascades (a removed plan run, dataset,
--     run or trial). They keep no `updated_at`: a trajectory replace, a run status move and
--     a trial/grade re-record write in place, and their own timestamps (started_at,
--     finished_at) already carry what changed and when.
--   * Datasets, cases and human labels are curated by people, so they soft delete.
--     Removing a human label now stamps `deleted_at` instead of deleting the row.
--   * uq_eval_human_labels_trajectory_rater stays a full (all-rows) constraint, not a
--     live-only partial index: re-labelling after a removal upserts on it and revives the
--     soft-deleted row (`deleted_at = NULL`), keeping one row per (trajectory, rater).
--   * uq_eval_datasets_repository_name_version also stays full: a new dataset takes
--     max(version) + 1 over every row, deleted ones included, so a version number is never
--     reused and a run's (dataset_id, dataset_version) always names exactly one row.

-- ---------------------------------------------------------------------------
-- agent_trajectories (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (145).

ALTER TABLE agent_trajectories ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- eval_datasets (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` (147).

ALTER TABLE eval_datasets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN eval_datasets.deleted_at IS
  'When this dataset version was soft deleted; NULL for live datasets. Deleted versions still count toward max(version), so a version number is never reused.';

ALTER TABLE eval_datasets ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- eval_cases (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (147). `updated_at` is backfilled from `created_at`,
-- so existing rows read "never updated".

ALTER TABLE eval_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
UPDATE eval_cases SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE eval_cases ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE eval_cases ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON COLUMN eval_cases.updated_at IS
  'When the case was last changed. Equal to created_at for a case never edited.';

ALTER TABLE eval_cases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN eval_cases.deleted_at IS
  'When this case was soft deleted; NULL for live cases. Trials that ran it keep their case_id.';

ALTER TABLE eval_cases ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- eval_human_labels (BaseModel)
-- ---------------------------------------------------------------------------
-- Already has `id`, `created_at` and `updated_at` (146).

ALTER TABLE eval_human_labels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN eval_human_labels.deleted_at IS
  'When the rater removed this label; NULL for live labels. Re-labelling the same trajectory revives the row (uq_eval_human_labels_trajectory_rater covers every row).';

ALTER TABLE eval_human_labels ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- eval_runs, eval_trials, eval_grades (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Each already has `id` and `created_at` (147).

ALTER TABLE eval_runs ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE eval_trials ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE eval_grades ALTER COLUMN id SET DEFAULT uuidv7();

-- ---------------------------------------------------------------------------
-- eval_judge_calibrations (BaseHardDeleteModel)
-- ---------------------------------------------------------------------------
-- Already has `id` and `created_at` (148).

ALTER TABLE eval_judge_calibrations ALTER COLUMN id SET DEFAULT uuidv7();
