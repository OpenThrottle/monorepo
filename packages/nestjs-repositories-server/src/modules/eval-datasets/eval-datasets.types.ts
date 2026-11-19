/**
 * @description Types for eval datasets and cases (eval_datasets, eval_cases, migrations 147, 181)
 * shared by EvalDatasetsRepository, EvalCasesRepository and their callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalDataset } from './eval-dataset.entity.ts';
import type {
  EVAL_DATASET_TARGET,
  EVAL_SPLIT,
} from './eval-datasets.constants.ts';
import type { EvalDatasetsRepository } from './eval-datasets.repository.ts';

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

/**
 * @description An {@link EvalDatasetsRepository} mock: every inherited `BaseRepository` method
 * plus the dataset ones.
 * @public
 */
export interface EvalDatasetsRepositoryMock extends BaseRepositoryMock<
  EvalDataset,
  CreateModelInput<EvalDataset>
> {
  readonly createDataset: Mock<EvalDatasetsRepository['createDataset']>;
  readonly findByRepository: Mock<EvalDatasetsRepository['findByRepository']>;
  readonly findDatasetById: Mock<EvalDatasetsRepository['findDatasetById']>;
}
