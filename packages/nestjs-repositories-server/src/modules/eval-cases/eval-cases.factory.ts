/**
 * @description Fishery factory for {@link EvalCase}. Use in tests to build mock cases.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { EVAL_SPLIT } from '../eval-datasets/eval-datasets.constants.ts';
import type { EvalCase } from './eval-case.entity.ts';

/**
 * Builds a live dev-split case with no source trajectory. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const evalCasesFactory = Factory.define<EvalCase>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    datasetId: faker.string.uuid(),
    deletedAt: null,
    gold: { passes: true },
    id: faker.string.uuid(),
    input: { prompt: 'Do the thing' },
    sourceTrajectoryId: null,
    split: EVAL_SPLIT.DEV,
    updatedAt: createdAt,
  };
});
