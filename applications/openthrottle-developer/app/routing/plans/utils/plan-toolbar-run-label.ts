import {
  PLAN_RUN_GATING_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';
import { getPlanScheduledRunReason } from '~/routing/plans/utils/plan-scheduled-run-reason';

/**
 * @description Accessible label for the {@link PlanToolbar} Run/Queue button,
 * varying with the plan status. Hoisted from the component file per
 * component-primitive-shape R4 (pure helpers live in the sibling utils/
 * folder).
 */
export const getPlanToolbarRunButtonLabel = (planStatus?: string): string => {
  switch (planStatus) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'PENDING':
      return 'Add to Queue';
    case 'PROMOTED':
      return 'Promoted';
    case 'QUEUED':
      return 'Queued';
    case 'SKIPPED':
      return 'Skipped';

    default:
      return 'Run plan';
  }
};

export interface PlanToolbarRunTooltipOptions {
  readonly branchMissing: boolean;
  readonly isRunning: boolean;
  readonly isSubmitting: boolean;
  readonly isTerminal: boolean;
  readonly scheduledRunAt: Date | string | null | undefined;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason: string | undefined;
}

/**
 * @description The primary Run button's tooltip. Precedence: submitting > terminal > running >
 * scheduled > blocked > branch missing > default (terminal and running are mutually exclusive).
 * A scheduled run outranks the workflow/branch gates because it is the reason the button is
 * disabled whatever else is true, and the only one the user can resolve from this toolbar.
 */
export const getPlanToolbarRunTooltip = (
  options: PlanToolbarRunTooltipOptions,
): string => {
  const scheduledReason = getPlanScheduledRunReason(options.scheduledRunAt);

  if (options.isSubmitting) {
    return 'Submitting…';
  }
  if (options.isTerminal) {
    return PLAN_TOOLBAR_COPY.runTerminalTooltip;
  }
  if (options.isRunning) {
    return PLAN_TOOLBAR_COPY.runRunningTooltip;
  }
  if (scheduledReason !== null) {
    return scheduledReason;
  }
  if (options.workflowRunBlocked) {
    return (
      options.workflowRunBlockedReason ??
      PLAN_TOOLBAR_COPY.workflowRunBlockedFallback
    );
  }
  if (options.branchMissing) {
    return PLAN_RUN_GATING_COPY.branchRequired;
  }

  return PLAN_TOOLBAR_COPY.runDefaultTooltip;
};
