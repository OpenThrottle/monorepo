/**
 * @description Fishery factory for {@link EvalHumanLabel}. Use in tests to build mock labels.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalHumanLabel } from './eval-human-label.entity.ts';
import { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';

/**
 * Builds a passing label with no failure type or note. Override any field via
 * `.build({ verdict: EVAL_LABEL_VERDICT.fail })`.
 * @public
 */
export const evalHumanLabelFactory = Factory.define<EvalHumanLabel>(() => ({
  createdAt: faker.date.past(),
  failureType: null,
  id: faker.string.uuid(),
  note: null,
  rater: 'visormatt',
  trajectoryId: faker.string.uuid(),
  updatedAt: faker.date.recent(),
  verdict: EVAL_LABEL_VERDICT.pass,
}));
