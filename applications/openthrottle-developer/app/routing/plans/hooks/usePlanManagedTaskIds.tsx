/**
 * @description Set of the current plan's rule-managed task ids, derived from the
 * route's rule-application ledger. Consumers pass `managed.has(task.id)` to task
 * rows so managed (rule-injected) tasks render a badge.
 *
 * The ledger is a deferred loader key, so this returns an empty set until it
 * resolves — the badge is simply absent for a moment rather than the Tasks tab
 * waiting on a field it does not otherwise need. `usePlanDeferredValue` keeps the
 * last resolved ledger across lifecycle revalidations so badges do not blink.
 */
import * as React from 'react';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { managedTaskIdsFromRuleApplications } from '~/routing/plans/utils/managed-tasks';

export const usePlanManagedTaskIds = (): ReadonlySet<string> => {
  const { ledger } = usePlanDetailRouteData();
  const resolved = usePlanDeferredValue(ledger);

  return React.useMemo(
    () => managedTaskIdsFromRuleApplications(resolved?.ruleApplications ?? []),
    [resolved],
  );
};
