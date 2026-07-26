/**
 * @description Route-scoped Jotai store for the plan-detail run-config form.
 * Creates a fresh store seeded once from the plan's persisted `runConfigJson` /
 * `jobRunHooksJson`, and provides it to the plan-detail subtree. Rendered with
 * `key={plan.id}` by the route so navigating between plans remounts it — a new
 * seeded store, so all run-config atoms auto-reset and two mounted plan routes
 * never share state. This replaces the shell's former plan-change re-seed effect.
 */
import * as React from 'react';
import { createStore, Provider } from 'jotai';
import {
  getWorkflowRunSeedValues,
  jobRunHookDraftRowsAtom,
  workflowCheckoutIdAtom,
  workflowRalphRunOptionsAtom,
  workflowRepositoryIdAtom,
  workflowRunIterationTimeoutTextAtom,
  workflowWorkingDirectoryAtom,
  type WorkflowRunSeedPlan,
} from '~/routing/plans/data/atom.plan';

export interface PlanRunConfigStoreProviderProps {
  readonly children: React.ReactNode;
  readonly plan: WorkflowRunSeedPlan;
}

export const PlanRunConfigStoreProvider = (
  props: PlanRunConfigStoreProviderProps,
): React.ReactElement => {
  const { children, plan } = props;

  // Hooks
  // Seed a fresh store once per mount (the route keys this component on plan.id,
  // so a new plan remounts and re-seeds).
  const [store] = React.useState(() => {
    const seeded = createStore();
    const seed = getWorkflowRunSeedValues(plan);

    seeded.set(workflowRalphRunOptionsAtom, seed.runOptions);
    seeded.set(workflowRunIterationTimeoutTextAtom, seed.iterationTimeoutText);
    seeded.set(workflowWorkingDirectoryAtom, seed.workingDirectory);
    seeded.set(workflowCheckoutIdAtom, seed.checkoutId);
    seeded.set(workflowRepositoryIdAtom, seed.repositoryId);
    seeded.set(jobRunHookDraftRowsAtom, seed.jobRunHookRows);

    return seeded;
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return <Provider store={store}>{children}</Provider>;
};
