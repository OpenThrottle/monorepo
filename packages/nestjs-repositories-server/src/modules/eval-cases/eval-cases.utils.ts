import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalCase } from './eval-case.entity.ts';
import type { EvalCasesRepositoryMock } from './eval-cases.types.ts';

/**
 * @description Builds an {@link EvalCasesRepositoryMock} that starts as an empty `eval_cases`
 * table (see `createBaseRepositoryMock`): the per-dataset listing resolves an empty list. Provide
 * it in place of `EvalCasesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalCasesRepositoryMock(): EvalCasesRepositoryMock {
  return {
    ...createBaseRepositoryMock<EvalCase, CreateModelInput<EvalCase>>(
      'eval_cases',
    ),
    findByDataset: vi.fn(async () => {
      return [];
    }),
  };
}
