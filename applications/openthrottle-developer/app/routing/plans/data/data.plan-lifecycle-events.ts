import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';

/**
 * Quiet period after the last plan/task event before a `/plans*` route revalidates, so a burst
 * of task flips (a runner closing one task and opening the next) costs one loader run.
 */
export const PLAN_LIFECYCLE_REVALIDATE_DELAY_MS = 250;

/** Events that change what the `/plans` list shows: plan rows, their status and task counts. */
export const PLANS_INDEX_REVALIDATE_EVENTS: readonly NotificationEventName[] = [
  NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
  NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
  NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
  NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
];

/** `/plans/:planId` also shows run state (queue, worktree wait, kill/settle), so it reacts to those too. */
export const PLAN_DETAIL_REVALIDATE_EVENTS: readonly NotificationEventName[] = [
  NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED,
  NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
  NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
  NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
  NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
  NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
  NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
];

/**
 * `/plans/:planId/tasks/:taskId` shows the task and its plan header. Task-scoped events are
 * further narrowed to the open task by `shouldRevalidateForLifecycleEvent`.
 */
export const TASK_DETAIL_REVALIDATE_EVENTS: readonly NotificationEventName[] = [
  NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
  NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
  NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
  NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
];
