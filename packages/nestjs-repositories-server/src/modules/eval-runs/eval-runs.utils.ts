import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalRun } from './eval-run.entity.ts';
import { evalRunsFactory } from './eval-runs.factory.ts';
import type { EvalRunsRepository } from './eval-runs.repository.ts';
import type { EvalRunsRepositoryMock } from './eval-runs.types.ts';

/**
 * @description Builds an {@link EvalRunsRepositoryMock} that starts as an empty `eval_runs`
 * table (see `createBaseRepositoryMock`): lookups resolve null or an empty list, a status move
 * matches no run (null), and `createRun` resolves a factory row carrying its input. Provide it in
 * place of `EvalRunsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalRunsRepositoryMock(): EvalRunsRepositoryMock {
  return {
    ...createBaseRepositoryMock<EvalRun, CreateModelInput<EvalRun>>(
      'eval_runs',
    ),
    createRun: vi.fn<EvalRunsRepository['createRun']>(async (input) => {
      return evalRunsFactory.build(input);
    }),
    findRunById: vi.fn(async () => {
      return null;
    }),
    findRunsByDataset: vi.fn(async () => {
      return [];
    }),
    updateRunStatus: vi.fn(async () => {
      return null;
    }),
  };
}
