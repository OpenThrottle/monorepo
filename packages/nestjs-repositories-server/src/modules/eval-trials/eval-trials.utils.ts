import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalTrial } from './eval-trial.entity.ts';
import { evalTrialsFactory } from './eval-trials.factory.ts';
import type { EvalTrialsRepository } from './eval-trials.repository.ts';
import type { EvalTrialsRepositoryMock } from './eval-trials.types.ts';

/**
 * @description Builds an {@link EvalTrialsRepositoryMock} that starts as an empty `eval_trials`
 * table (see `createBaseRepositoryMock`): the per-run listing resolves an empty list and
 * `upsertTrial` resolves a factory row carrying its input. Provide it in place of
 * `EvalTrialsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalTrialsRepositoryMock(): EvalTrialsRepositoryMock {
  return {
    ...createBaseRepositoryMock<EvalTrial, CreateModelInput<EvalTrial>>(
      'eval_trials',
    ),
    findByRun: vi.fn(async () => {
      return [];
    }),
    upsertTrial: vi.fn<EvalTrialsRepository['upsertTrial']>(async (input) => {
      return evalTrialsFactory.build(input);
    }),
  };
}
