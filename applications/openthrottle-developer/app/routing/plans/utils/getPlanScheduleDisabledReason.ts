import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import {
  getPlanIsRunning,
  getPlanIsTerminal,
} from '~/routing/plans/utils/utils.plans';

/**
 * @description Why a plan cannot be scheduled, or `null` when it can. Only PENDING and BACKLOG
 * schedule, and SCHEDULED reschedules; BLOCKED, active (QUEUED / IN_PROGRESS) and terminal plans
 * are rejected by the server (D2), so the toolbar disables Schedule with this reason instead.
 * A plan with no runnable tasks cannot be scheduled either (the server refuses it up front).
 * An unknown or missing status is allowed: the server stays the gate.
 */
export const getPlanScheduleDisabledReason = (
  planStatus: string | null | undefined,
  noRunnableTasks = false,
): string | null => {
  if (planStatus === 'BLOCKED') {
    return PLAN_TOOLBAR_COPY.scheduleBlockedTooltip;
  }

  if (getPlanIsRunning(planStatus)) {
    return PLAN_TOOLBAR_COPY.scheduleActiveTooltip;
  }

  if (getPlanIsTerminal(planStatus)) {
    return PLAN_TOOLBAR_COPY.scheduleTerminalTooltip;
  }

  if (noRunnableTasks) {
    return PLAN_TOOLBAR_COPY.runNoRunnableTasksTooltip;
  }

  return null;
};
