/**
 * @description Fishery factory for {@link EvalDataset}. Use in tests to build mock datasets.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalDataset } from './eval-dataset.entity.ts';
import { EVAL_DATASET_TARGET } from './eval-datasets.constants.ts';

/**
 * Builds a live version 1 of a plan_task dataset. Override any field via
 * `.build({ version: 2 })`.
 * @public
 */
export const evalDatasetsFactory = Factory.define<EvalDataset>(() => {
  const createdAt = faker.date.past();

  return {
    createdAt,
    createdBy: 'visormatt',
    deletedAt: null,
    description: null,
    id: faker.string.uuid(),
    name: faker.lorem.slug(2),
    repositoryId: faker.string.uuid(),
    target: EVAL_DATASET_TARGET.PLAN_TASK,
    updatedAt: createdAt,
    version: 1,
  };
});
