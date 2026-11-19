import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalGrade } from './eval-grade.entity.ts';
import { evalGradesFactory } from './eval-grades.factory.ts';
import type { EvalGradesRepository } from './eval-grades.repository.ts';
import type { EvalGradesRepositoryMock } from './eval-grades.types.ts';

/**
 * @description Builds an {@link EvalGradesRepositoryMock} that starts as an empty `eval_grades`
 * table (see `createBaseRepositoryMock`): the per-trial listing resolves an empty list and
 * `upsertGrade` resolves a factory row carrying its input. Provide it in place of
 * `EvalGradesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalGradesRepositoryMock(): EvalGradesRepositoryMock {
  return {
    ...createBaseRepositoryMock<EvalGrade, CreateModelInput<EvalGrade>>(
      'eval_grades',
    ),
    findByTrials: vi.fn(async () => {
      return [];
    }),
    upsertGrade: vi.fn<EvalGradesRepository['upsertGrade']>(async (input) => {
      return evalGradesFactory.build(input);
    }),
  };
}
