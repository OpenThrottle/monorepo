/**
 * @description Types for human trajectory labels (eval_human_labels, migration 146) shared by
 * EvalHumanLabelsService and its callers.
 */

import type { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';

/** @public */
export type EvalLabelVerdict =
  (typeof EVAL_LABEL_VERDICT)[keyof typeof EVAL_LABEL_VERDICT];

/**
 * @description Everything needed to record or replace one rater's label on a trajectory.
 * @public
 */
export interface UpsertEvalHumanLabelInput {
  readonly failureType: string | null;
  readonly note: string | null;
  readonly rater: string;
  readonly trajectoryId: string;
  readonly verdict: EvalLabelVerdict;
}

/**
 * @description Identifies one rater's label on one trajectory.
 * @public
 */
export interface RemoveEvalHumanLabelInput {
  readonly rater: string;
  readonly trajectoryId: string;
}
