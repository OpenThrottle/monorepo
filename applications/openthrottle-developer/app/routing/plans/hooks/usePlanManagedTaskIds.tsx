/**
 * @description Set of the current plan's rule-managed task ids, derived from the
 * route's already-loaded rule-application ledger. Consumers pass
 * `managed.has(task.id)` to task rows so managed (rule-injected) tasks render a
 * badge. Memoized on the ledger reference.
 */
import * as React from 'react';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { managedTaskIdsFromRuleApplications } from '~/routing/plans/utils/managed-tasks';

export const usePlanManagedTaskIds = (): ReadonlySet<string> => {
  const { ruleApplications } = usePlanDetailRouteData();

  return React.useMemo(
    () => managedTaskIdsFromRuleApplications(ruleApplications ?? []),
    [ruleApplications],
  );
};
