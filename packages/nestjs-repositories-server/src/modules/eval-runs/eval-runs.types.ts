/**
 * @description Types for eval runs (eval_runs, migrations 147, 181) shared by
 * EvalRunsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalRun } from './eval-run.entity.ts';
import type { EVAL_AUTH_MODE, EVAL_RUN_STATUS } from './eval-runs.constants.ts';
import type { EvalRunsRepository } from './eval-runs.repository.ts';

/** @public */
export type EvalAuthMode = (typeof EVAL_AUTH_MODE)[keyof typeof EVAL_AUTH_MODE];

/** @public */
export type EvalRunStatus =
  (typeof EVAL_RUN_STATUS)[keyof typeof EVAL_RUN_STATUS];

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
 * repository from the status, never supplied.
 * @public
 */
export interface UpdateEvalRunStatusInput {
  readonly runId: string;
  readonly status: EvalRunStatus;
}

/**
 * @description An {@link EvalRunsRepository} mock: every inherited `BaseRepository` method plus
 * the run ones.
 * @public
 */
export interface EvalRunsRepositoryMock extends BaseRepositoryMock<
  EvalRun,
  CreateModelInput<EvalRun>
> {
  readonly createRun: Mock<EvalRunsRepository['createRun']>;
  readonly findRunById: Mock<EvalRunsRepository['findRunById']>;
  readonly findRunsByDataset: Mock<EvalRunsRepository['findRunsByDataset']>;
  readonly updateRunStatus: Mock<EvalRunsRepository['updateRunStatus']>;
}
