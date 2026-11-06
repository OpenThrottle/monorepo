-- Eval human labels: one person's verdict on one agent trajectory.
--
-- Decisions 6 and 9 of docs/openthrottle/eval-system-adr.md. A rater reads a trajectory and records
-- pass/fail, an optional failure type and a free-text note. The notes are the open/axial-coding
-- material of error analysis; the verdicts are the ground truth LLM judges are calibrated against
-- (Cohen's kappa). One label per rater per trajectory: re-labelling replaces the rater's own row.
--
-- verdict is CHECK-constrained TEXT (no Postgres enum), mirrored by an `as const` object in
-- TypeScript. The foreign key is added in its own pg_constraint-guarded statement so a re-run
-- against an existing table still lands it (see databases/README.md § Foreign keys).

CREATE TABLE IF NOT EXISTS eval_human_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trajectory_id UUID NOT NULL,
    rater TEXT NOT NULL,
    verdict TEXT NOT NULL,
    failure_type TEXT NULL,
    note TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eval_human_labels_verdict CHECK (verdict IN ('pass', 'fail')),
    CONSTRAINT uq_eval_human_labels_trajectory_rater UNIQUE (trajectory_id, rater)
);

COMMENT ON TABLE eval_human_labels IS 'Human verdicts on agent trajectories: one row per (trajectory, rater). The notes are error-analysis coding material and the verdicts are the ground truth LLM judges are calibrated against (Cohen''s kappa). trial_id linkage arrives with the eval tables task. See docs/openthrottle/eval-system-adr.md (Decisions 6 and 9).';

COMMENT ON COLUMN eval_human_labels.id IS 'Surrogate key.';

COMMENT ON COLUMN eval_human_labels.trajectory_id IS 'Trajectory the label is about (FK agent_trajectories.id, ON DELETE CASCADE). Linkage to an eval trial arrives with the eval tables task.';

COMMENT ON COLUMN eval_human_labels.rater IS 'Who recorded the label: the GitHub username (or author string), the same convention as plan authors. Stamped server-side from the request identity, never taken from client input.';

COMMENT ON COLUMN eval_human_labels.verdict IS 'The rater''s judgement of the trajectory: pass or fail. Judge-calibration ground truth. chk_eval_human_labels_verdict.';

COMMENT ON COLUMN eval_human_labels.failure_type IS 'Free-text failure category for a fail verdict. NULL when not given. Free text for now: the taxonomy comes out of error analysis.';

COMMENT ON COLUMN eval_human_labels.note IS 'Free-text observation (open coding) about the trajectory. NULL when not given.';

COMMENT ON COLUMN eval_human_labels.created_at IS 'When the rater first labelled this trajectory.';

COMMENT ON COLUMN eval_human_labels.updated_at IS 'When the rater last replaced their label. Bumped on every re-label.';

CREATE INDEX IF NOT EXISTS idx_eval_human_labels_trajectory_id ON eval_human_labels (trajectory_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eval_human_labels_trajectory_id_fkey') THEN
    ALTER TABLE eval_human_labels ADD CONSTRAINT eval_human_labels_trajectory_id_fkey
      FOREIGN KEY (trajectory_id) REFERENCES agent_trajectories (id) ON DELETE CASCADE;
  END IF;
END
$$;
