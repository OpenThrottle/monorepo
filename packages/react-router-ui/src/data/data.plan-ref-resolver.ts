import type { PlanRefMatch } from '../types';

/**
 * @description Stable empty result for `usePlanRefResolver` (same identity every
 * render, since callers may put `matches` in a dependency array).
 */
export const EMPTY_PLAN_REF_MATCHES: readonly PlanRefMatch[] = [];
