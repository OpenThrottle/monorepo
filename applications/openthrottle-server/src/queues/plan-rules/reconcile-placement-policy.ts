/**
 * @description Kill switch for the continuous inject-task placement reconcile
 * (`PLAN_RULES_RECONCILE_PLACEMENT_ENABLED`). The managed-invariant reposition
 * is ON by default; set the flag to a falsy value (`false`/`0`/`no`/`off`) to
 * turn it off in production without a code revert — injected tasks then keep
 * their first-apply position (the pre-fix behavior) instead of being
 * repositioned every evaluation pass.
 */

import type { ConfigService } from '@nestjs/config';

const DISABLED_VALUES: readonly string[] = ['0', 'false', 'no', 'off'];

/**
 * @description True unless `PLAN_RULES_RECONCILE_PLACEMENT_ENABLED` is explicitly
 * set to a falsy value. Unset (the default) keeps reconcile enabled.
 */
export const isReconcilePlacementEnabled = (config: ConfigService): boolean => {
  const value = config
    .get<string>('PLAN_RULES_RECONCILE_PLACEMENT_ENABLED')
    ?.trim()
    .toLowerCase();

  return value == null || value === '' || !DISABLED_VALUES.includes(value);
};
