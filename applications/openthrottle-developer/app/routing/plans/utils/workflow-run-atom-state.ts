import type { PlanRunConfigOtLoop } from '@openthrottle/openthrottle-plan-config';

import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  jobRunHookEntriesToDraftRows,
  parseJobRunHooksJsonFromPlan,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { hydratePlanRunConfigUiState } from '~/routing/plans/utils/plan-run-config-ui';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import { getDefaultPlanRunOptions } from '~/routing/plans/utils/plan-run-options';

/**
 * @description Default workflow run form state: {@link PlanRunOptions}
 * plus the raw agent-timeout text field (parsed for the GraphQL tuning input).
 */
export interface WorkflowRunAtomDefaultState {
  readonly iterationTimeoutText: string;
  readonly runOptions: PlanRunOptions;
}

/**
 * @description Builds default atom state; aligns with uncontrolled workflow
 * config initialization and reset-to-defaults.
 */
export const getWorkflowRunAtomDefaultState = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): WorkflowRunAtomDefaultState => {
  return {
    iterationTimeoutText: '',
    runOptions: getDefaultPlanRunOptions(options),
  };
};

/**
 * @description Minimal plan shape the seed reads (satisfied by the route loader plan).
 */
export interface WorkflowRunSeedPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

/**
 * @description Initial values for the run-config primitives, derived from a
 * plan's persisted `runConfigJson` / `jobRunHooksJson`. Consumed by the route-scoped
 * Provider's `useHydrateAtoms` seed (once per plan mount), replacing the shell's
 * former re-seed effect. Single source of truth for seeding.
 */
export interface WorkflowRunSeedValues {
  readonly checkoutId: string;
  readonly iterationTimeoutText: string;
  readonly jobRunHookRows: JobRunHookDraftRow[];
  readonly otLoop: PlanRunConfigOtLoop | undefined;
  readonly repositoryId: string;
  readonly runOptions: PlanRunOptions;
  readonly workingDirectory: string;
}

/**
 * @description Builds {@link WorkflowRunSeedValues} from a plan; invalid
 * `jobRunHooksJson` falls back to an empty hook list (matches prior hydrate).
 */
export const getWorkflowRunSeedValues = (
  plan: WorkflowRunSeedPlan,
): WorkflowRunSeedValues => {
  const hydrated = hydratePlanRunConfigUiState(plan.id, plan.runConfigJson);

  let jobRunHookRows: JobRunHookDraftRow[];
  try {
    jobRunHookRows = jobRunHookEntriesToDraftRows(
      parseJobRunHooksJsonFromPlan(plan.jobRunHooksJson),
    );
  } catch {
    jobRunHookRows = jobRunHookEntriesToDraftRows([]);
  }

  return {
    checkoutId: hydrated.checkoutId,
    iterationTimeoutText: hydrated.iterationTimeoutText,
    jobRunHookRows,
    otLoop: hydrated.otLoop,
    repositoryId: hydrated.repositoryId,
    runOptions: hydrated.workflowInput,
    workingDirectory: hydrated.workingDirectory,
  };
};
