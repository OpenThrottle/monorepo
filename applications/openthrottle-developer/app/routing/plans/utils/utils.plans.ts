import { BadgeProps } from '@openthrottle/react-router-shadcn';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { planStatusValues, PlanStatusKey } from '~/routing/plans/types';

/**
 * @description True when a task/plan status string is a known
 * {@link planStatusValues} key (safe before passing to `PlanStatusBadge`).
 */
export const isPlanStatusKey = (value: string): value is PlanStatusKey => {
  return Object.prototype.hasOwnProperty.call(planStatusValues, value);
};

/**
 * Terminal task statuses that count as "resolved" for the plan-detail Tasks
 * progress count: COMPLETED (done) and SKIPPED (won't be worked on — e.g.
 * promoted into its own plan). Everything else is still open work.
 */
const RESOLVED_TASK_STATUSES: ReadonlySet<string> = new Set([
  'COMPLETED',
  'SKIPPED',
]);

/**
 * Count of a plan's tasks that are resolved — COMPLETED or SKIPPED — for the
 * `Tasks (resolved/total)` progress label. SKIPPED tasks are effectively done
 * or won't be worked on, so they count toward progress the same as COMPLETED.
 */
export const getResolvedTaskCount = (
  tasks: readonly PlanTaskRowFragment[],
): number => {
  return tasks.filter((task) => RESOLVED_TASK_STATUSES.has(task.status)).length;
};

/**
 * Canonical "a run is active" check: true while the plan is QUEUED or
 * IN_PROGRESS. This is the single predicate the plan and task toolbars gate
 * their mutating actions on (Run/Queue, Evaluate rules, Mark Complete, Promote,
 * status transitions) so those cannot fire out from under a live worker. Kill
 * run is the deliberate exception — it stays available while running.
 */
export const getPlanIsRunning = (
  status: string | null | undefined,
): boolean => {
  return status === 'QUEUED' || status === 'IN_PROGRESS';
};

/**
 * Whether the UI should offer stopping a Ralph / plan-run job
 * for this plan status (queue or active worker). Shares the exact
 * QUEUED/IN_PROGRESS condition with {@link getPlanIsRunning}.
 */
export const getPlanIsCancelable = (
  status: string | null | undefined,
): boolean => {
  return getPlanIsRunning(status);
};

/**
 * Terminal plan statuses — the plan is finished or abandoned, so there is no
 * more work to do here: COMPLETED (done), CANCELED (abandoned), SKIPPED (won't
 * be worked on). To do more work, fall forward and ship a new plan.
 */
const PLAN_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'CANCELED',
  'COMPLETED',
  'SKIPPED',
]);

/**
 * Canonical "the plan is in a terminal state (no more work here)" check: true
 * for COMPLETED / CANCELED / SKIPPED. This is the single predicate the plan and
 * task toolbars gate their mutating actions on when a plan is finished/abandoned
 * (Run/Queue, Evaluate rules, and the task-level Mark Complete + Promote), the
 * terminal-status counterpart to {@link getPlanIsRunning}. The plan-level Mark
 * Complete stays gated on COMPLETED only (the sole recovery path to done for a
 * mis-canceled/skipped plan), so it deliberately does not use this predicate.
 */
export const getPlanIsTerminal = (
  status: string | null | undefined,
): boolean => {
  return status != null && PLAN_TERMINAL_STATUSES.has(status);
};

/**
 * Returns the color for a plan status badge
 */
export const getPlanStatusBadgeColor = (
  status: PlanStatusKey,
): BadgeProps['color'] => {
  let color: BadgeProps['color'] = `default`;

  switch (status) {
    case 'BACKLOG':
      color = `violet`;
      break;
    case 'BLOCKED':
      color = `red`;
      break;
    case 'CANCELED':
      color = `slate`;
      break;
    case 'COMPLETED':
      color = `lime`;
      break;
    case 'IN_PROGRESS':
      color = `yellow`;
      break;
    case 'PENDING':
      color = `sky`;
      break;
    case 'QUEUED':
      color = `amber`;
      break;
    case 'SKIPPED':
      color = `red`;

      break;
  }

  return color;
};
