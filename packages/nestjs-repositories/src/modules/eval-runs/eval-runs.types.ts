/**
 * @description Types for eval runs, trials and grades (eval_runs, eval_trials, eval_grades,
 * migration 147) shared by EvalRunsService and its callers.
 */

import type {
  EVAL_AUTH_MODE,
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
} from './eval-runs.constants.ts';

/**
 * @description A JSON value as stored in a JSONB column. Typed shallowly (any object) on purpose:
 * the recursive JSON type makes TypeORM's QueryDeepPartialEntity instantiate infinitely.
 * @public
 */
export type EvalJsonValue = boolean | number | object | string | null;

/** @public */
export type EvalAuthMode = (typeof EVAL_AUTH_MODE)[keyof typeof EVAL_AUTH_MODE];

/** @public */
export type EvalGradeVerdict =
  (typeof EVAL_GRADE_VERDICT)[keyof typeof EVAL_GRADE_VERDICT];

/** @public */
export type EvalGraderKind =
  (typeof EVAL_GRADER_KIND)[keyof typeof EVAL_GRADER_KIND];

/** @public */
export type EvalRunStatus =
  (typeof EVAL_RUN_STATUS)[keyof typeof EVAL_RUN_STATUS];

/** @public */
export type EvalTrialStatus =
  (typeof EVAL_TRIAL_STATUS)[keyof typeof EVAL_TRIAL_STATUS];

/**
 * @description Everything needed to record a run. Budgets are null for unlimited.
 * @public
 */
export interface CreateEvalRunInput {
  readonly authMode: EvalAuthMode;
  readonly budgetTokens: number | null;
  readonly budgetUsd: number | null;
  readonly createdBy: string;
  readonly datasetId: string;
  readonly datasetVersion: number;
  readonly driver: string;
  readonly effort: string | null;
  readonly k: number;
  readonly model: string | null;
  readonly promptSha: string | null;
  readonly skillSha: string | null;
  readonly status: EvalRunStatus;
}

/**
 * @description Moves a run to a new status. `startedAt` and `finishedAt` are stamped by the
 * service from the status, never supplied.
 * @public
 */
export interface UpdateEvalRunStatusInput {
  readonly runId: string;
  readonly status: EvalRunStatus;
}

/**
 * @description Everything needed to record (or re-record, on resume) one attempt. A re-record of
 * the same (run, case, attempt) replaces the earlier row.
 * @public
 */
export interface UpsertEvalTrialInput {
  readonly attempt: number;
  readonly caseId: string;
  readonly costUsd: number | null;
  readonly durationMs: number | null;
  readonly error: string | null;
  readonly runId: string;
  readonly status: EvalTrialStatus;
  readonly trajectoryId: string | null;
}

/**
 * @description Everything needed to record one grader's verdict on a trial. A re-record of the
 * same (trial, grader id, grader version) replaces the earlier row.
 * @public
 */
export interface UpsertEvalGradeInput {
  readonly cacheKey: string | null;
  readonly costUsd: number | null;
  readonly errorReason: string | null;
  readonly evidence: EvalJsonValue;
  readonly graderId: string;
  readonly graderKind: EvalGraderKind;
  readonly graderVersion: string;
  readonly judgeDriver: string | null;
  readonly judgeModel: string | null;
  readonly judgeModelVersion: string | null;
  readonly trialId: string;
  readonly verdict: EvalGradeVerdict;
}
