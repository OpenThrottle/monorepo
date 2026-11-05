import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface PlanMarkCompleteTooltipInput {
  readonly isCompleted: boolean;
  readonly isRunning: boolean;
}

/**
 * @description Tooltip for the plan toolbar's Mark Complete button, explaining
 * why it is disabled. A completed plan outranks a running one.
 */
export const getPlanMarkCompleteTooltip = (
  input: PlanMarkCompleteTooltipInput,
): string => {
  const { isCompleted, isRunning } = input;

  if (isCompleted) {
    return 'Plan is already completed';
  }

  if (isRunning) {
    return PLAN_TOOLBAR_COPY.markCompleteRunningTooltip;
  }

  return 'Mark this plan as completed';
};
