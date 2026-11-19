/**
 * @description Types for eval trials (eval_trials, migrations 147, 181) shared by
 * EvalTrialsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalTrial } from './eval-trial.entity.ts';
import type { EVAL_TRIAL_STATUS } from './eval-trials.constants.ts';
import type { EvalTrialsRepository } from './eval-trials.repository.ts';

/** @public */
export type EvalTrialStatus =
  (typeof EVAL_TRIAL_STATUS)[keyof typeof EVAL_TRIAL_STATUS];

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
 * @description An {@link EvalTrialsRepository} mock: every inherited `BaseRepository` method plus
 * the trial ones.
 * @public
 */
export interface EvalTrialsRepositoryMock extends BaseRepositoryMock<
  EvalTrial,
  CreateModelInput<EvalTrial>
> {
  readonly findByRun: Mock<EvalTrialsRepository['findByRun']>;
  readonly upsertTrial: Mock<EvalTrialsRepository['upsertTrial']>;
}
