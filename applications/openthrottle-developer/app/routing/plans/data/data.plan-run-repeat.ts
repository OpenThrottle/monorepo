import type { PlanRunRepeat } from '~/routing/plans/types';

/** @description Repeat choices in the order the select lists them (order carries meaning). */
export const PLAN_RUN_REPEAT_ORDER: readonly PlanRunRepeat[] = [
  'none',
  'daily',
  'weekdays',
  'weekly',
  'custom',
];
