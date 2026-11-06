-- Eval tables: datasets, cases, runs, trials and grades.
--
-- Decisions 6, 8 and 9 of docs/openthrottle/eval-system-adr.md. A dataset is a versioned, per-repository
-- set of cases; a run is one configuration executed over a dataset's cases k times; a trial is one
-- attempt at one case, linked 1:1 to the agent_trajectories row that recorded it; a grade is one
-- grader's verdict on one trial. The column sets and CHECK values line up with the types in
-- packages/agentic-evals (EvalSplit, EvalAuthMode, EvalTrialStatus, GraderKind, GraderVerdict) so the
-- runner persists its output 1:1.
--
-- Every closed value set is CHECK-constrained TEXT (no Postgres enums), mirrored by an `as const`
-- object in TypeScript. Foreign keys are added in their own pg_constraint-guarded statements so a
-- re-run against existing tables still lands them (see databases/README.md § Foreign keys).

-- ---------------------------------------------------------------------------------------------
-- eval_datasets
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL,
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    description TEXT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_datasets_target CHECK (target IN ('plan_task', 'skill', 'mcp_tool_selection')),
    CONSTRAINT chk_eval_datasets_version CHECK (version >= 1),
    CONSTRAINT uq_eval_datasets_repository_name_version UNIQUE (repository_id, name, version)
);

COMMENT ON TABLE eval_datasets IS 'A versioned, per-repository set of eval cases. Re-creating a dataset under an existing (repository, name) bumps version rather than editing the old one, so a run always points at the exact cases it ran. See docs/openthrottle/eval-system-adr.md (Decision 6).';

COMMENT ON COLUMN eval_datasets.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_datasets.repository_id IS 'Repository the dataset belongs to (FK repositories.id, ON DELETE CASCADE). Evals are scoped per project, not to this monorepo.';

COMMENT ON COLUMN eval_datasets.name IS 'Human-readable dataset name, unique per repository together with version.';

COMMENT ON COLUMN eval_datasets.target IS 'What the dataset evaluates: plan_task (an agent working a plan task), skill, or mcp_tool_selection. chk_eval_datasets_target.';

COMMENT ON COLUMN eval_datasets.version IS 'Dataset version, starting at 1. A new dataset under an existing (repository, name) takes max(version) + 1. chk_eval_datasets_version.';

COMMENT ON COLUMN eval_datasets.description IS 'Free-text description of what the dataset covers. NULL when not given.';

COMMENT ON COLUMN eval_datasets.created_by IS 'Who created the dataset: the GitHub username (or author string), the same convention as plan authors. Stamped server-side from the request identity, never taken from client input.';

COMMENT ON COLUMN eval_datasets.created_at IS 'When the dataset version was created.';

COMMENT ON COLUMN eval_datasets.updated_at IS 'When the dataset row was last changed.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_datasets_repository_id_fkey') THEN
    ALTER TABLE eval_datasets ADD CONSTRAINT eval_datasets_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- eval_cases
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL,
    split TEXT NOT NULL,
    input JSONB NOT NULL,
    gold JSONB NOT NULL,
    source_trajectory_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_cases_split CHECK (split IN ('dev', 'test'))
);

COMMENT ON TABLE eval_cases IS 'One input for the agent plus what a correct outcome looks like. source_trajectory_id records the real failure a case was mined from. See docs/openthrottle/eval-system-adr.md (Decision 6).';

COMMENT ON COLUMN eval_cases.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_cases.dataset_id IS 'Dataset the case belongs to (FK eval_datasets.id, ON DELETE CASCADE).';

COMMENT ON COLUMN eval_cases.split IS 'Which side of the dataset the case sits on: dev (for iterating) or test (held out). chk_eval_cases_split.';

COMMENT ON COLUMN eval_cases.input IS 'What the agent is asked to do (the agentic-evals EvalCaseInput: prompt plus cwd setup), or a derived object describing the source trajectory.';

COMMENT ON COLUMN eval_cases.gold IS 'What a correct outcome looks like (the agentic-evals EvalCase gold JSON value). Graders read it; its shape is dataset-target specific.';

COMMENT ON COLUMN eval_cases.source_trajectory_id IS 'The agent_trajectories row (a real failure) the case was created from (FK agent_trajectories.id, ON DELETE SET NULL). NULL for hand-written cases or after the trajectory is pruned.';

COMMENT ON COLUMN eval_cases.created_at IS 'When the case was added.';

CREATE INDEX IF NOT EXISTS idx_eval_cases_dataset_id ON eval_cases (dataset_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_cases_dataset_id_fkey') THEN
    ALTER TABLE eval_cases ADD CONSTRAINT eval_cases_dataset_id_fkey
      FOREIGN KEY (dataset_id) REFERENCES eval_datasets (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_cases_source_trajectory_id_fkey') THEN
    ALTER TABLE eval_cases ADD CONSTRAINT eval_cases_source_trajectory_id_fkey
      FOREIGN KEY (source_trajectory_id) REFERENCES agent_trajectories (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- eval_runs
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL,
    dataset_version INTEGER NOT NULL,
    driver TEXT NOT NULL,
    model TEXT NULL,
    effort TEXT NULL,
    prompt_sha TEXT NULL,
    skill_sha TEXT NULL,
    auth_mode TEXT NOT NULL,
    k INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    budget_tokens INTEGER NULL,
    budget_usd NUMERIC(12, 6) NULL,
    created_by TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NULL,
    finished_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_runs_auth_mode CHECK (auth_mode IN ('api_key', 'subscription')),
    CONSTRAINT chk_eval_runs_k CHECK (k >= 1),
    CONSTRAINT chk_eval_runs_status CHECK (status IN ('pending', 'running', 'usage_limited', 'completed', 'failed', 'cancelled'))
);

COMMENT ON TABLE eval_runs IS 'One configuration (driver, model, effort, prompt and skill content SHAs, auth mode) executed over a dataset, k attempts per case. usage_limited is a pause, not a failure: the run can resume. See docs/openthrottle/eval-system-adr.md (Decisions 6 and 8).';

COMMENT ON COLUMN eval_runs.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_runs.dataset_id IS 'Dataset that was run (FK eval_datasets.id, ON DELETE CASCADE).';

COMMENT ON COLUMN eval_runs.dataset_version IS 'The dataset version the run executed, copied from eval_datasets.version so the run stays interpretable on its own.';

COMMENT ON COLUMN eval_runs.driver IS 'Agent driver under test, for example claude (the agentic-evals EvalRunConfig driverId).';

COMMENT ON COLUMN eval_runs.model IS 'Model under test. NULL when the driver default was used.';

COMMENT ON COLUMN eval_runs.effort IS 'Reasoning effort under test. NULL when the driver default was used.';

COMMENT ON COLUMN eval_runs.prompt_sha IS 'Content SHA of the prompt under test. NULL when the run does not vary a prompt.';

COMMENT ON COLUMN eval_runs.skill_sha IS 'Content SHA of the skill under test. NULL when the run does not vary a skill.';

COMMENT ON COLUMN eval_runs.auth_mode IS 'How the CLI was billed: api_key or subscription. Recorded so a report can flag a comparison across auth modes. chk_eval_runs_auth_mode.';

COMMENT ON COLUMN eval_runs.k IS 'Attempts per case (the agentic-evals EvalRunConfig attempts). chk_eval_runs_k.';

COMMENT ON COLUMN eval_runs.status IS 'Run lifecycle: pending, running, usage_limited (paused, resumable), completed, failed or cancelled. chk_eval_runs_status.';

COMMENT ON COLUMN eval_runs.budget_tokens IS 'Token budget for the whole run (input plus output of finished trials). NULL means unlimited.';

COMMENT ON COLUMN eval_runs.budget_usd IS 'Dollar budget for the whole run. NULL means unlimited.';

COMMENT ON COLUMN eval_runs.created_by IS 'Who started the run: the GitHub username (or author string). Stamped server-side from the request identity.';

COMMENT ON COLUMN eval_runs.started_at IS 'When the run began executing. NULL while pending.';

COMMENT ON COLUMN eval_runs.finished_at IS 'When the run reached a terminal status. NULL while it is unfinished.';

COMMENT ON COLUMN eval_runs.created_at IS 'When the run was recorded.';

CREATE INDEX IF NOT EXISTS idx_eval_runs_dataset_id ON eval_runs (dataset_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_runs_dataset_id_fkey') THEN
    ALTER TABLE eval_runs ADD CONSTRAINT eval_runs_dataset_id_fkey
      FOREIGN KEY (dataset_id) REFERENCES eval_datasets (id) ON DELETE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- eval_trials
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    case_id UUID NOT NULL,
    attempt INTEGER NOT NULL,
    trajectory_id UUID NULL,
    status TEXT NOT NULL,
    error TEXT NULL,
    cost_usd NUMERIC(12, 6) NULL,
    duration_ms INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_trials_attempt CHECK (attempt >= 1),
    CONSTRAINT chk_eval_trials_status CHECK (status IN ('completed', 'errored', 'usage_limited')),
    CONSTRAINT uq_eval_trials_run_case_attempt UNIQUE (run_id, case_id, attempt)
);

COMMENT ON TABLE eval_trials IS 'One attempt (1..k) at one case within a run, linked to the agent_trajectories row that recorded it. A human label on a trial is the eval_human_labels row on trajectory_id. See docs/openthrottle/eval-system-adr.md (Decisions 6 and 8).';

COMMENT ON COLUMN eval_trials.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_trials.run_id IS 'Run the trial belongs to (FK eval_runs.id, ON DELETE CASCADE).';

COMMENT ON COLUMN eval_trials.case_id IS 'Case the trial attempted (FK eval_cases.id, ON DELETE CASCADE).';

COMMENT ON COLUMN eval_trials.attempt IS 'Attempt number for this (run, case), starting at 1. chk_eval_trials_attempt.';

COMMENT ON COLUMN eval_trials.trajectory_id IS 'The agent_trajectories row the attempt produced (FK agent_trajectories.id, ON DELETE SET NULL). NULL when no trajectory was captured.';

COMMENT ON COLUMN eval_trials.status IS 'How the attempt ended: completed, errored, or usage_limited (a pause excluded from pass rates). chk_eval_trials_status.';

COMMENT ON COLUMN eval_trials.error IS 'Failure message for an errored trial. NULL otherwise.';

COMMENT ON COLUMN eval_trials.cost_usd IS 'Cost of the attempt in USD. NULL means unpriceable, which is not the same as zero.';

COMMENT ON COLUMN eval_trials.duration_ms IS 'Wall-clock duration of the attempt in milliseconds. NULL when unknown.';

COMMENT ON COLUMN eval_trials.created_at IS 'When the trial was recorded.';

CREATE INDEX IF NOT EXISTS idx_eval_trials_case_id ON eval_trials (case_id);

CREATE INDEX IF NOT EXISTS idx_eval_trials_trajectory_id ON eval_trials (trajectory_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_trials_run_id_fkey') THEN
    ALTER TABLE eval_trials ADD CONSTRAINT eval_trials_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES eval_runs (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_trials_case_id_fkey') THEN
    ALTER TABLE eval_trials ADD CONSTRAINT eval_trials_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES eval_cases (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_trials_trajectory_id_fkey') THEN
    ALTER TABLE eval_trials ADD CONSTRAINT eval_trials_trajectory_id_fkey
      FOREIGN KEY (trajectory_id) REFERENCES agent_trajectories (id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- eval_grades
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID NOT NULL,
    grader_id TEXT NOT NULL,
    grader_version TEXT NOT NULL,
    grader_kind TEXT NOT NULL,
    judge_driver TEXT NULL,
    judge_model TEXT NULL,
    judge_model_version TEXT NULL,
    verdict TEXT NOT NULL,
    evidence JSONB NULL,
    error_reason TEXT NULL,
    cost_usd NUMERIC(12, 6) NULL,
    cache_key TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_grades_error_reason CHECK ((verdict = 'error') = (error_reason IS NOT NULL)),
    CONSTRAINT chk_eval_grades_grader_kind CHECK (grader_kind IN ('code', 'judge', 'human')),
    CONSTRAINT chk_eval_grades_judge_model CHECK (grader_kind <> 'judge' OR judge_model IS NOT NULL),
    CONSTRAINT chk_eval_grades_verdict CHECK (verdict IN ('pass', 'fail', 'error')),
    CONSTRAINT uq_eval_grades_trial_grader_version UNIQUE (trial_id, grader_id, grader_version)
);

COMMENT ON TABLE eval_grades IS 'One grader''s verdict on one trial. Records the grader id and version and, for judges, the judge driver, model and model version, so a stored grade never mixes two meanings. verdict error means the grader could not decide, which is not the agent failing. See docs/openthrottle/eval-system-adr.md (Decision 9).';

COMMENT ON COLUMN eval_grades.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_grades.trial_id IS 'Trial that was graded (FK eval_trials.id, ON DELETE CASCADE).';

COMMENT ON COLUMN eval_grades.grader_id IS 'Stable id of the grader (the agentic-evals Grader id).';

COMMENT ON COLUMN eval_grades.grader_version IS 'Version of the grader; it changes whenever the check changes. Part of the unique key, so re-grading with a new version adds a row.';

COMMENT ON COLUMN eval_grades.grader_kind IS 'code (deterministic check), judge (a model answers one binary question) or human. chk_eval_grades_grader_kind.';

COMMENT ON COLUMN eval_grades.judge_driver IS 'Driver that ran the judge. NULL unless grader_kind is judge.';

COMMENT ON COLUMN eval_grades.judge_model IS 'Model that ran the judge. Required when grader_kind is judge (chk_eval_grades_judge_model); NULL otherwise.';

COMMENT ON COLUMN eval_grades.judge_model_version IS 'Version or snapshot of the judge model when the provider reports one. NULL when unknown.';

COMMENT ON COLUMN eval_grades.verdict IS 'pass, fail, or error (the grader itself could not decide; excluded from pass rates). chk_eval_grades_verdict.';

COMMENT ON COLUMN eval_grades.evidence IS 'Evidence the grader quoted for a pass or fail, as a JSON value. NULL for an error verdict.';

COMMENT ON COLUMN eval_grades.error_reason IS 'Why the grader could not decide. Set exactly when verdict is error (chk_eval_grades_error_reason).';

COMMENT ON COLUMN eval_grades.cost_usd IS 'Cost of grading in USD. NULL for code graders and for judges whose driver cannot be priced.';

COMMENT ON COLUMN eval_grades.cache_key IS 'Judge-cache key (hash of grader id and version, judge model, rubric and the graded content). NULL for graders that are not cached.';

COMMENT ON COLUMN eval_grades.created_at IS 'When the grade was recorded.';

CREATE INDEX IF NOT EXISTS idx_eval_grades_cache_key ON eval_grades (cache_key) WHERE cache_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_grades_trial_id_fkey') THEN
    ALTER TABLE eval_grades ADD CONSTRAINT eval_grades_trial_id_fkey
      FOREIGN KEY (trial_id) REFERENCES eval_trials (id) ON DELETE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- eval_human_labels: a trial links 1:1 to its trajectory, so a label on a trial is the label on
-- trial.trajectory_id. No trial_id column is added.
-- ---------------------------------------------------------------------------------------------

COMMENT ON TABLE eval_human_labels IS 'Human verdicts on agent trajectories: one row per (trajectory, rater). The notes are error-analysis coding material and the verdicts are the ground truth LLM judges are calibrated against (Cohen''s kappa). A trial links 1:1 to its trajectory (eval_trials.trajectory_id), so a label on a trial is the label on that trajectory; there is no trial_id column. See docs/openthrottle/eval-system-adr.md (Decisions 6 and 9).';

COMMENT ON COLUMN eval_human_labels.trajectory_id IS 'Trajectory the label is about (FK agent_trajectories.id, ON DELETE CASCADE). An eval trial reaches its labels through eval_trials.trajectory_id.';
