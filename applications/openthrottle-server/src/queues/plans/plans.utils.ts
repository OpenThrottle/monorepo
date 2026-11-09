import {
  isRunnableRalphTask,
  isWorkableRalphTask,
} from '@openthrottle/openthrottle-agentic-ralph';

import { RUN_PLAN_ORCHESTRATOR_JOB_NAME } from '../agentic-ralph/agentic-ralph.constants.ts';
import { RUN_PLAN_SPAWN_JOB_NAME } from './plans.constants.ts';
import { PLAN_RUN_LIMIT_LABEL_BY_REASON } from './plans.constants.ts';
import type {
  FinishedRunNotification,
  FinishedRunNotificationInput,
  PlanSettleStatus,
  PlanTaskCounts,
  PlanTaskOutcomeFields,
} from './plans.types.ts';

/**
 * @description Counts a plan's tasks by what an agent run can still do with them, using the same
 * workable/remaining split as the orchestrator (`isWorkableRalphTask` / `isRunnableRalphTask`).
 */
export const countPlanTasks = (
  tasks: readonly PlanTaskOutcomeFields[],
): PlanTaskCounts => {
  const remaining = tasks.filter((task) => isRunnableRalphTask(task));
  const workable = remaining.filter((task) => isWorkableRalphTask(task));

  return {
    blocked: remaining.length - workable.length,
    remaining: remaining.length,
    workable: workable.length,
  };
};

/**
 * @description The status a plan with no running job belongs in: QUEUED while a task is still
 * workable (a re-run can make progress), COMPLETED when nothing remains, and BLOCKED when only
 * BLOCKED tasks are left — a state no run can move, so it must not sit in the queue. A plan with no
 * tasks at all (`undefined` counts) stays QUEUED: it was never run, so it is not stranded.
 */
export const resolveIdlePlanStatus = (
  counts: PlanTaskCounts | undefined,
): PlanSettleStatus => {
  if (counts === undefined || counts.workable > 0) {
    return 'QUEUED';
  }

  if (counts.remaining === 0) {
    return 'COMPLETED';
  }

  return 'BLOCKED';
};

/**
 * @description The queue-job-completed notification for a run that finished (not failed, cancelled
 * or usage-limited), keyed on the outcome reason rather than on a guess from the plan status. A run
 * that stopped short of COMPLETED warns and says why, so a task-blocked plan reads differently from
 * one that ran out of iterations or time.
 */
export const buildFinishedRunNotification = (
  input: FinishedRunNotificationInput,
): FinishedRunNotification => {
  const { counts, planId, planStatus, prNumber, reason } = input;
  const prSuffix = prNumber === undefined ? '' : ` PR #${prNumber}.`;
  const pendingSummary = `${counts.workable} task(s) still pending, ${counts.blocked} blocked`;

  if (reason === 'workflow_plan_already_terminal') {
    return {
      message: `Plan run skipped: ${planId} (plan already terminal)`,
      severity: 'success',
    };
  }

  if (reason === 'workflow_complete_handoff_owed') {
    // Finished plan + agent asked for input (or an owed post-plan step). Settle COMPLETED — never
    // FAILED — and keep the reason in the notification text.
    return {
      message: `Plan run finished with handoff owed: ${planId} (workflow_complete_handoff_owed)`,
      severity: 'warning',
    };
  }

  if (reason === 'workflow_tasks_blocked') {
    return {
      message: `Plan blocked: ${counts.blocked} task(s) need attention — ${planId}.${prSuffix}`,
      severity: 'warning',
    };
  }

  const limit = PLAN_RUN_LIMIT_LABEL_BY_REASON.get(reason);

  // The last iteration can finish the plan before the limit check runs.
  if (limit !== undefined && planStatus !== 'COMPLETED') {
    return {
      message: `Plan hit its ${limit}: ${planId} — ${pendingSummary}. Re-run to continue.${prSuffix}`,
      severity: 'warning',
    };
  }

  return {
    message: `Plan run finished: ${planId} (${reason})${prSuffix}`,
    severity: 'success',
  };
};
/**
 * @description Job names on the plans queue that represent a Ralph/plan run (spawn or orchestrator).
 * Used for cancellation and observability filters.
 */
const PLAN_RALPH_BULL_JOB_NAMES = [
  RUN_PLAN_SPAWN_JOB_NAME,
  RUN_PLAN_ORCHESTRATOR_JOB_NAME,
] as const;

/**
 * @description True when `name` is a plan Ralph job type on the plans queue.
 */
export const isPlanRalphBullJobName = (
  name: string | null | undefined,
): boolean => {
  return (
    name != null &&
    PLAN_RALPH_BULL_JOB_NAMES.some((jobName) => jobName === name)
  );
};
