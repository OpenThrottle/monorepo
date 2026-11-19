/**
 * @description Fishery factory for {@link EvalRun}. Use in tests to build mock runs.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalRun } from './eval-run.entity.ts';
import { EVAL_AUTH_MODE, EVAL_RUN_STATUS } from './eval-runs.constants.ts';

/**
 * Builds a pending subscription-auth run with k = 1. Override any field via
 * `.build({ status: EVAL_RUN_STATUS.RUNNING })`.
 * @public
 */
export const evalRunsFactory = Factory.define<EvalRun>(() => ({
  authMode: EVAL_AUTH_MODE.SUBSCRIPTION,
  budgetTokens: null,
  budgetUsd: null,
  createdAt: faker.date.past(),
  createdBy: 'visormatt',
  datasetId: faker.string.uuid(),
  datasetVersion: 1,
  driver: 'claude',
  effort: null,
  finishedAt: null,
  id: faker.string.uuid(),
  k: 1,
  model: null,
  promptSha: null,
  skillSha: null,
  startedAt: null,
  status: EVAL_RUN_STATUS.PENDING,
}));
