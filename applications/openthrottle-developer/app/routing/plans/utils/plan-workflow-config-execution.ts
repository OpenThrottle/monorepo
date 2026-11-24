import type { PlanRunDriverUi } from '~/routing/plans/utils/plan-run-options';

/** Runner drivers offered in the execution selector, in display order. */
export const PLAN_RUN_SELECTABLE_DRIVERS = [
  'cursor',
  'claude',
] as const satisfies readonly PlanRunDriverUi[];

export const isSelectablePlanRunDriver = (
  value: string,
): value is PlanRunDriverUi => {
  return PLAN_RUN_SELECTABLE_DRIVERS.some((driver) => driver === value);
};
