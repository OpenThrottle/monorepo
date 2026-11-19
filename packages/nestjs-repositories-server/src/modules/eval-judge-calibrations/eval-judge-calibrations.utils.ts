import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { evalJudgeCalibrationsFactory } from './eval-judge-calibrations.factory.ts';
import type { EvalJudgeCalibrationsRepository } from './eval-judge-calibrations.repository.ts';
import type { EvalJudgeCalibrationsRepositoryMock } from './eval-judge-calibrations.types.ts';

/**
 * @description Builds an {@link EvalJudgeCalibrationsRepositoryMock} that starts as an empty
 * `eval_judge_calibrations` table (see `createBaseRepositoryMock`): the history is empty, there
 * are no judge pairs, and `record` resolves a factory row carrying its input. Provide it in place
 * of `EvalJudgeCalibrationsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createEvalJudgeCalibrationsRepositoryMock(): EvalJudgeCalibrationsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      EvalJudgeCalibration,
      CreateModelInput<EvalJudgeCalibration>
    >('eval_judge_calibrations'),
    findByGrader: vi.fn(async () => {
      return [];
    }),
    findJudgePairs: vi.fn(async () => {
      return { judges: [], nConflicted: 0, nUnlabeled: 0, pairs: [] };
    }),
    record: vi.fn<EvalJudgeCalibrationsRepository['record']>(async (input) => {
      return evalJudgeCalibrationsFactory.build(input);
    }),
  };
}
