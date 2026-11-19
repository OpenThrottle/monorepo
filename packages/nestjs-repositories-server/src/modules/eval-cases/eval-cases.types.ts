/**
 * @description Types for eval_cases (migrations 147, 181) shared by EvalCasesRepository and its
 * callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalCase } from './eval-case.entity.ts';
import type { EvalCasesRepository } from './eval-cases.repository.ts';

/**
 * @description An {@link EvalCasesRepository} mock: every inherited `BaseRepository` method plus
 * the case ones.
 * @public
 */
export interface EvalCasesRepositoryMock extends BaseRepositoryMock<
  EvalCase,
  CreateModelInput<EvalCase>
> {
  readonly findByDataset: Mock<EvalCasesRepository['findByDataset']>;
}
