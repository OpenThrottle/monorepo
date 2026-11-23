/**
 * @description Maps the run-options UI state to the GraphQL tuning input consumed by
 * `enqueuePlanRun`.
 * Queued runs are always plan-scoped; the panel's target mode does not reach enqueue.
 */

import type { PlanRunTuningInput } from '~/__generated__/graphql';

import type { PlanRunOptions } from './plan-run-options';
import { DEFAULT_RUN_DRIVER, DEFAULT_RUN_MODEL } from './plan-run-options';

/**
 * @description Maps run options to the GraphQL tuning input for `enqueuePlanRun`. Returns
 * `undefined` when every field matches the defaults so the mutation can omit the tuning.
 */
export const buildPlanRunTuningInput = (
  input: PlanRunOptions,
): PlanRunTuningInput | undefined => {
  const tuning: PlanRunTuningInput = {};

  if (input.driver !== DEFAULT_RUN_DRIVER) {
    tuning.driver = input.driver;
  }

  if (
    input.iterationTimeoutSeconds != null &&
    input.iterationTimeoutSeconds >= 1
  ) {
    tuning.iterationTimeoutSeconds = Math.floor(input.iterationTimeoutSeconds);
  }

  const model = input.model.trim();
  if (model !== '' && model !== DEFAULT_RUN_MODEL) {
    tuning.model = model;
  }

  // Empty = unset: the driver keeps its own reasoning default and nothing is sent.
  const effort = input.effort.trim();
  if (effort !== '') {
    tuning.effort = effort;
  }

  // Blank = derive plan-<short plan id> at enqueue, so only an explicit override is sent.
  const worktreeName = input.worktreeName.trim();
  if (worktreeName !== '') {
    tuning.worktreeName = worktreeName;
  }

  if (Object.keys(tuning).length === 0) {
    return undefined;
  }

  return tuning;
};
