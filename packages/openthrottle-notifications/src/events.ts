/**
 * @description Shared notification event names, severity, and payload shapes for the
 * OpenThrottle server–developer app contract. Real-time delivery is over GraphQL
 * subscriptions (graphql-ws); the Socket.IO path has been retired.
 *
 * Source-of-truth split: these types define the event-name discriminators and
 * severity used across server and developer app. The actual on-the-wire payloads
 * are the code-first `NotificationEvent` types in the server GraphQL schema — treat
 * those schema types as authoritative for wire shape, and these interfaces as the
 * discriminator/severity contract they map onto.
 */

import type { NotificationSeverity } from './types.ts';

/**
 * @description Well-known notification event names. Used as the event-name
 * discriminator when emitting (server) or handling (developer app) notifications
 * delivered over graphql-ws subscriptions.
 */
export const NOTIFICATION_EVENT_NAMES = {
  DEBUG: 'debug',
  PLAN_ENQUEUED: 'plan.enqueued',
  PLAN_STATUS_CHANGED: 'plan.status_changed',
  PLAN_UPDATED: 'plan.updated',
  PLAN_WAITING_FOR_WORKTREE: 'plan.waiting_for_worktree',
  QUEUE_JOB_COMPLETED: 'queue.job.completed',
  SYSTEM_ALERT: 'system.alert',
  TASK_COMPLETED: 'task.completed',
  TASK_STATUS_CHANGED: 'task.status_changed',
} as const;

export type NotificationEventName =
  (typeof NOTIFICATION_EVENT_NAMES)[keyof typeof NOTIFICATION_EVENT_NAMES];

/**
 * @description Base payload fields present on all notification events.
 */
export interface NotificationPayloadBase {
  /**
   * Optional id of the user this notification pertains to (the actor who
   * triggered the event or the owner of the affected resource).
   *
   * Additive, versioned contract field: when present, the server can route the
   * notification to a per-user topic (`userNotificationsTopic(actorUserId)`)
   * instead of (or in addition to) the firehose, so authenticated subscribers
   * only receive notifications they own. When absent, the server falls back to
   * the existing firehose/plan/system fan-out, preserving prior behavior.
   */
  readonly actorUserId?: string;
  /**
   * Optional app-relative path for click-through (e.g. `/plans/:id`).
   * When present, the developer app can show a "View plan" (or similar) link.
   */
  readonly link?: string;
  /** Human-readable message for display in toast or list. */
  readonly message: string;
  /** Severity for styling and filtering. */
  readonly severity: NotificationSeverity;
  /** ISO 8601 timestamp when the event occurred. */
  readonly timestamp: string;
}

/**
 * @description Payload for debugging purposes, we accept a raw `data` object.
 */
export interface DebugPayload extends NotificationPayloadBase {
  /**
   * Arbitrary debug payload, JSON-stringified by the server and fanned out to the
   * firehose. The contract cannot enforce runtime limits, so callers MUST keep this
   * small, non-sensitive, and JSON-serializable: no secrets/PII, no large blobs, and
   * no circular references (stringify would throw). Enforce real size/shape guards in
   * the emitting consumer — broadcasting a large or circular object reaches every
   * subscriber.
   */
  readonly data: unknown;
}

/**
 * @description Payload for plan.enqueued. Emit when a plan is enqueued for processing.
 * Includes queue position so the UI can show "Your plan is #2 of 5 in queue".
 */
export interface PlanEnqueuedPayload extends NotificationPayloadBase {
  readonly planId: string;
  /** Position of this job in the waiting queue (1-based). */
  readonly queuePosition: number;
  /** Total number of jobs waiting in the queue (including this one). */
  readonly queueTotal: number;
}

/**
 * @description Payload for plan.updated. Emit when a plan is created, updated, or status changes.
 */
export interface PlanUpdatedPayload extends NotificationPayloadBase {
  readonly planId: string;
  readonly taskId?: string;
}

/**
 * @description Payload for task.completed. Emit when a task is completed or status changes.
 */
export interface TaskCompletedPayload extends NotificationPayloadBase {
  readonly planId: string;
  readonly taskId: string;
}

/**
 * @description Payload for queue.job.completed. Emit when a queue processor finishes a job.
 */
export interface QueueJobCompletedPayload extends NotificationPayloadBase {
  /** Queue or job type identifier (e.g. "plans", "daily-stats"). */
  readonly jobType: string;
  readonly planId?: string;
  readonly taskId?: string;
}

/**
 * @description Payload for system.alert. Emit for system-wide alerts (e.g. maintenance, errors).
 */
export interface SystemAlertPayload extends NotificationPayloadBase {
  /** Optional code or category for filtering (e.g. "maintenance", "outage"). */
  readonly code?: string;
}

/**
 * @description Union of all notification payloads. Use when handling a generic
 * notification (e.g. storing in a list) where the event name is tracked separately.
 */
export type NotificationPayload =
  | DebugPayload
  | PlanEnqueuedPayload
  | PlanUpdatedPayload
  | PlanWaitingForWorktreePayload
  | QueueJobCompletedPayload
  | SystemAlertPayload
  | TaskCompletedPayload;

/**
 * @description Payload for plan.waiting_for_worktree. Emit when a plan job is delayed
 * because all worktrees are currently locked. The job will automatically retry after the delay.
 */
export interface PlanWaitingForWorktreePayload extends NotificationPayloadBase {
  readonly planId: string;
  /** Delay in milliseconds before the job will retry. */
  readonly retryDelayMs: number;
}

/**
 * @description Shared base for status-change events.
 *
 * Status-change events are intentionally display-less **revalidation signals**, not
 * user-facing toasts. They deliberately do NOT extend {@link NotificationPayloadBase}
 * (no `message`/`severity`/`link`) and are deliberately excluded from the
 * {@link NotificationPayload} union — a generic toast/list handler iterating
 * `NotificationPayload` will never receive one. Consumers handle these separately to
 * revalidate plan/task detail (e.g. `plans/$planId`) without a manual refresh; do not
 * write code assuming every event carries a `message`.
 */
export interface StatusChangeBase {
  readonly planId: string;
  readonly status: string;
  readonly timestamp: string;
}

/**
 * @description Payload for plan.status_changed. Emit when a plan's status is updated.
 * Intentionally display-less (see {@link StatusChangeBase}): used by the developer app
 * to revalidate plan detail (e.g. plans/$planId) without manual refresh, not to toast.
 */
export type PlanStatusChangedPayload = StatusChangeBase;

/**
 * @description Payload for task.status_changed. Emit when a task's status is updated.
 * Intentionally display-less (see {@link StatusChangeBase}): used by the developer app
 * to revalidate plan detail so the tasks list stays in sync, not to toast.
 */
export interface TaskStatusChangedPayload extends StatusChangeBase {
  readonly taskId: string;
}

/**
 * @description Discriminated union for status-change events. Use when handling
 * either plan or task status change in one handler (e.g. "if planId matches, revalidate").
 */
export type StatusChangePayload =
  | ({ readonly kind: 'plan_status_changed' } & PlanStatusChangedPayload)
  | ({ readonly kind: 'task_status_changed' } & TaskStatusChangedPayload);

/**
 * @description Map from event name to payload type. Use for type-safe emit/on.
 */
export interface NotificationEventMap {
  [NOTIFICATION_EVENT_NAMES.DEBUG]: DebugPayload;
  [NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED]: PlanEnqueuedPayload;
  [NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED]: PlanStatusChangedPayload;
  [NOTIFICATION_EVENT_NAMES.PLAN_UPDATED]: PlanUpdatedPayload;
  [NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE]: PlanWaitingForWorktreePayload;
  [NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED]: QueueJobCompletedPayload;
  [NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT]: SystemAlertPayload;
  [NOTIFICATION_EVENT_NAMES.TASK_COMPLETED]: TaskCompletedPayload;
  [NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED]: TaskStatusChangedPayload;
}
