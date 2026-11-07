-- Eval judge calibrations: one measurement of a judge against human labels.
--
-- Decision 9 of docs/openthrottle/eval-system-adr.md. A judge question is calibrated against human
-- labels and reports Cohen's kappa (with a bootstrap 95% interval), catch rate and false-fail rate;
-- the result decides whether the judge may gate, run unsupervised, or is reported only. The same
-- table calibrates the critic panel of OT plan 012fa4b0, so nothing here depends on a failure
-- taxonomy: grader_id is any grader (judge question or critic) and the status is derived from kappa.
--
-- status is CHECK-constrained TEXT (no Postgres enum), mirrored by an `as const` object in
-- TypeScript. Foreign keys are added in their own pg_constraint-guarded statements so a re-run
-- against an existing table still lands them (see databases/README.md § Foreign keys).

CREATE TABLE IF NOT EXISTS eval_judge_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grader_id TEXT NOT NULL,
    grader_version TEXT NOT NULL,
    judge_driver TEXT NULL,
    judge_model TEXT NOT NULL,
    judge_model_version TEXT NULL,
    dataset_id UUID NULL,
    split TEXT NULL,
    run_id UUID NULL,
    n INTEGER NOT NULL,
    n_excluded INTEGER NOT NULL DEFAULT 0,
    kappa DOUBLE PRECISION NULL,
    kappa_ci_low DOUBLE PRECISION NULL,
    kappa_ci_high DOUBLE PRECISION NULL,
    catch_rate DOUBLE PRECISION NULL,
    false_fail_rate DOUBLE PRECISION NULL,
    status TEXT NOT NULL,
    held_out BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_judge_calibrations_n CHECK (n >= 0 AND n_excluded >= 0),
    CONSTRAINT chk_eval_judge_calibrations_rates CHECK (
        (catch_rate IS NULL OR (catch_rate >= 0 AND catch_rate <= 1))
        AND (false_fail_rate IS NULL OR (false_fail_rate >= 0 AND false_fail_rate <= 1))
    ),
    CONSTRAINT chk_eval_judge_calibrations_split CHECK (split IS NULL OR split IN ('dev', 'test')),
    CONSTRAINT chk_eval_judge_calibrations_split_needs_dataset CHECK (split IS NULL OR dataset_id IS NOT NULL),
    CONSTRAINT chk_eval_judge_calibrations_status CHECK (status IN ('unsupervised', 'gating', 'non_gating', 'insufficient'))
);

COMMENT ON TABLE eval_judge_calibrations IS 'One measurement of a judge (or critic) against human labels: Cohen''s kappa with a bootstrap 95% interval, catch rate, false-fail rate, the pair count and the resulting gating status. Append-only history: re-calibrating inserts a new row, so a judge''s trust can be traced over time. Calibration may be ad hoc (no dataset). See docs/openthrottle/eval-system-adr.md (Decision 9).';

COMMENT ON COLUMN eval_judge_calibrations.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_judge_calibrations.grader_id IS 'Stable id of the grader that was calibrated (the agentic-evals Grader id, matching eval_grades.grader_id). A judge question or a critic of the critic panel.';

COMMENT ON COLUMN eval_judge_calibrations.grader_version IS 'Version of the grader that was calibrated (matching eval_grades.grader_version). A calibration only speaks for this version.';

COMMENT ON COLUMN eval_judge_calibrations.judge_driver IS 'Driver that ran the judge. NULL when not recorded.';

COMMENT ON COLUMN eval_judge_calibrations.judge_model IS 'Model that ran the judge. Required: a calibration of an unnamed model is meaningless.';

COMMENT ON COLUMN eval_judge_calibrations.judge_model_version IS 'Version or snapshot of the judge model when the provider reports one. NULL when unknown.';

COMMENT ON COLUMN eval_judge_calibrations.dataset_id IS 'Dataset whose cases were labelled for the calibration (FK eval_datasets.id, ON DELETE CASCADE). NULL for an ad hoc calibration not tied to a dataset, for example a critic panel measured on loose trajectories.';

COMMENT ON COLUMN eval_judge_calibrations.split IS 'Which split of the dataset the labelled cases came from: dev or test. NULL when the calibration is not split-scoped. Requires dataset_id (chk_eval_judge_calibrations_split_needs_dataset). chk_eval_judge_calibrations_split.';

COMMENT ON COLUMN eval_judge_calibrations.run_id IS 'Eval run the judge grades were read from (FK eval_runs.id, ON DELETE SET NULL). NULL when the pairs were supplied directly or the run was deleted.';

COMMENT ON COLUMN eval_judge_calibrations.n IS 'Number of (judge, human) pairs used for the statistics. Judge error verdicts are not counted here (see n_excluded). chk_eval_judge_calibrations_n.';

COMMENT ON COLUMN eval_judge_calibrations.n_excluded IS 'Number of pairs left out because the judge returned an error verdict (it could not decide, which is neither agreement nor disagreement). Reported separately so a flaky judge is visible. chk_eval_judge_calibrations_n.';

COMMENT ON COLUMN eval_judge_calibrations.kappa IS 'Cohen''s kappa between the judge and the human labels. NULL when undefined: no pairs, or one rater was constant.';

COMMENT ON COLUMN eval_judge_calibrations.kappa_ci_low IS 'Lower bound of the bootstrap 95% interval of kappa (10,000 resamples, fixed seed). NULL when kappa is NULL.';

COMMENT ON COLUMN eval_judge_calibrations.kappa_ci_high IS 'Upper bound of the bootstrap 95% interval of kappa. NULL when kappa is NULL.';

COMMENT ON COLUMN eval_judge_calibrations.catch_rate IS 'P(judge says fail | human says fail), in [0, 1]. NULL when the humans never failed a trial. chk_eval_judge_calibrations_rates.';

COMMENT ON COLUMN eval_judge_calibrations.false_fail_rate IS 'P(judge says fail | human says pass), in [0, 1]. NULL when the humans never passed a trial. chk_eval_judge_calibrations_rates.';

COMMENT ON COLUMN eval_judge_calibrations.status IS 'What the calibration allows: unsupervised (kappa >= 0.8), gating (kappa >= 0.6), non_gating (below, or kappa undefined) or insufficient (too few pairs to say). Derived from kappa and n by the agentic-evals calibrateJudge. chk_eval_judge_calibrations_status.';

COMMENT ON COLUMN eval_judge_calibrations.held_out IS 'TRUE when the calibration is of the held-out judge that no loop, critic or prompt optimization ever sees. FALSE for working judges.';

COMMENT ON COLUMN eval_judge_calibrations.created_by IS 'Who recorded the calibration: the GitHub username (or author string). Stamped server-side from the request identity, never taken from client input.';

COMMENT ON COLUMN eval_judge_calibrations.created_at IS 'When the calibration was recorded.';

CREATE INDEX IF NOT EXISTS idx_eval_judge_calibrations_grader ON eval_judge_calibrations (grader_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_judge_calibrations_dataset_id ON eval_judge_calibrations (dataset_id) WHERE dataset_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_judge_calibrations_dataset_id_fkey') THEN
    ALTER TABLE eval_judge_calibrations ADD CONSTRAINT eval_judge_calibrations_dataset_id_fkey
      FOREIGN KEY (dataset_id) REFERENCES eval_datasets (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_judge_calibrations_run_id_fkey') THEN
    ALTER TABLE eval_judge_calibrations ADD CONSTRAINT eval_judge_calibrations_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES eval_runs (id) ON DELETE SET NULL;
  END IF;
END
$$;
