/**
 * @description Fishery factory for {@link EvalTrial}. Use in tests to build mock trials.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalTrial } from './eval-trial.entity.ts';
import { EVAL_TRIAL_STATUS } from './eval-trials.constants.ts';

/**
 * Builds a completed first attempt with no trajectory. Override any field via `.build({ ... })`.
 * @public
 */
export const evalTrialsFactory = Factory.define<EvalTrial>(() => ({
  attempt: 1,
  caseId: faker.string.uuid(),
  costUsd: null,
  createdAt: faker.date.past(),
  durationMs: faker.number.int({ max: 600_000, min: 1_000 }),
  error: null,
  id: faker.string.uuid(),
  runId: faker.string.uuid(),
  status: EVAL_TRIAL_STATUS.COMPLETED,
  trajectoryId: null,
}));
