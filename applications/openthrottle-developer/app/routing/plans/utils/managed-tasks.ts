/**
 * @description Derives which of a plan's tasks are actively rule-managed from the
 * plan's rule-application ledger (already loaded by the plan detail route). A
 * task is managed when a tag→action rule has an 'applied' application pointing at
 * it — the injected task of a still-applied inject-task rule, whose placement the
 * server reconciles every evaluation pass. The UI uses this to badge such tasks
 * so the reconciled-placement invariant is visible.
 */

/** Rule-application ledger state that marks a task as actively managed. */
export const RULE_MANAGED_APPLICATION_STATE = 'applied';

/** Minimal shape of a rule application needed to derive managed tasks. */
export interface ManagedTaskRuleApplication {
  readonly state: string;
  readonly taskId?: string | null;
}

/**
 * @description The set of task ids that carry an 'applied' rule application.
 */
export const managedTaskIdsFromRuleApplications = (
  ruleApplications: readonly ManagedTaskRuleApplication[],
): ReadonlySet<string> => {
  const managed = new Set<string>();
  for (const application of ruleApplications) {
    if (
      application.state === RULE_MANAGED_APPLICATION_STATE &&
      application.taskId != null
    ) {
      managed.add(application.taskId);
    }
  }
  return managed;
};
