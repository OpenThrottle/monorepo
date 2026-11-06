/**
 * @description Fishery factories for {@link EvalDataset} and {@link EvalCase}. Use in tests to
 * build mock datasets and cases.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalCase } from './eval-case.entity.ts';
import type { EvalDataset } from './eval-dataset.entity.ts';
import { EVAL_DATASET_TARGET, EVAL_SPLIT } from './eval-datasets.constants.ts';

/**
 * Builds version 1 of a plan_task dataset. Override any field via `.build({ version: 2 })`.
 * @public
 */
export const evalDatasetFactory = Factory.define<EvalDataset>(() => ({
  createdAt: faker.date.past(),
  createdBy: 'visormatt',
  description: null,
  id: faker.string.uuid(),
  name: faker.lorem.slug(2),
  repositoryId: faker.string.uuid(),
  target: EVAL_DATASET_TARGET.PLAN_TASK,
  updatedAt: faker.date.recent(),
  version: 1,
}));

/**
 * Builds a dev-split case with no source trajectory. Override any field via `.build({ ... })`.
 * @public
 */
export const evalCaseFactory = Factory.define<EvalCase>(() => ({
  createdAt: faker.date.past(),
  datasetId: faker.string.uuid(),
  gold: { passes: true },
  id: faker.string.uuid(),
  input: { prompt: 'Do the thing' },
  sourceTrajectoryId: null,
  split: EVAL_SPLIT.DEV,
}));
