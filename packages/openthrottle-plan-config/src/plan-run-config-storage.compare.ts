/**
 * @description Compares persisted `plans.run_config` to canonical defaults.
 */

import { getDefaultPlanRunConfigStorage } from './plan-run-config-storage.defaults';
import type { PlanRunConfigStorage } from './plan-run-config-storage.types';
import { planRunConfigFromPlanStorage } from './plan-run-config-storage.validation';

const planRunConfigStorageDeepEqual = (
  left: PlanRunConfigStorage,
  right: PlanRunConfigStorage,
): boolean => JSON.stringify(left) === JSON.stringify(right);

/**
 * @description Returns true when stored run configuration differs from defaults
 * for the given plan (or task) context after normalization.
 */
export const planHasCustomRunConfig = (
  stored: unknown,
  options?: { readonly planId?: string; readonly taskId?: string },
): boolean => {
  const normalized = planRunConfigFromPlanStorage(stored, options);
  const defaults = getDefaultPlanRunConfigStorage(options);

  return !planRunConfigStorageDeepEqual(normalized, defaults);
};
