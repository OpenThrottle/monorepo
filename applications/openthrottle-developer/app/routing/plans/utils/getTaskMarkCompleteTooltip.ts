import { PLAN_TASK_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface TaskMarkCompleteTooltipInput {
  readonly isCompleted: boolean;
  readonly planIsRunning: boolean;
  readonly planIsTerminal: boolean;
}

/**
 * @description Tooltip for the task toolbar's Mark Complete button, explaining
 * why it is disabled. A completed task outranks a terminal plan, which outranks
 * a running plan.
 */
export const getTaskMarkCompleteTooltip = (
  input: TaskMarkCompleteTooltipInput,
): string => {
  const { isCompleted, planIsRunning, planIsTerminal } = input;

  if (isCompleted) {
    return 'Task is already completed';
  }

  if (planIsTerminal) {
    return PLAN_TASK_TOOLBAR_COPY.markCompleteTerminalTooltip;
  }

  if (planIsRunning) {
    return PLAN_TASK_TOOLBAR_COPY.markCompleteRunningTooltip;
  }

  return 'Mark this task as completed';
};
