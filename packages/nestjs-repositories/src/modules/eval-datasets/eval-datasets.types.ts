/**
 * @description Types for eval datasets and cases (eval_datasets, eval_cases, migration 147) shared
 * by EvalDatasetsService and its callers.
 */

import type {
  EVAL_DATASET_TARGET,
  EVAL_SPLIT,
} from './eval-datasets.constants.ts';

/** @public */
export type EvalDatasetTarget =
  (typeof EVAL_DATASET_TARGET)[keyof typeof EVAL_DATASET_TARGET];

/** @public */
export type EvalSplit = (typeof EVAL_SPLIT)[keyof typeof EVAL_SPLIT];

/**
 * @description One case to insert with its dataset. `gold` and `input` are JSON values.
 * @public
 */
export interface CreateEvalCaseInput {
  readonly gold: unknown;
  readonly input: unknown;
  readonly sourceTrajectoryId: string | null;
  readonly split: EvalSplit;
}

/**
 * @description Everything needed to create a dataset version with its cases. The version is not
 * an input: it is max(version) + 1 for the repository and name, or 1.
 * @public
 */
export interface CreateEvalDatasetInput {
  readonly cases: readonly CreateEvalCaseInput[];
  readonly createdBy: string;
  readonly description: string | null;
  readonly name: string;
  readonly repositoryId: string;
  readonly target: EvalDatasetTarget;
}
