import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';

/**
 * @description Stub event subscription rows for the settings UI shell. Event names align
 * with {@link NOTIFICATION_EVENT_NAMES}; replace with API-backed subscription state when
 * the user settings / Socket.IO filter API exists.
 */
export const EVENT_SUBSCRIPTION_ROWS = [
  {
    defaultSubscribed: true,
    description: `When a plan's title, description, or metadata changes.`,
    id: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    label: 'Plan updated',
  },
  {
    defaultSubscribed: true,
    description: `When a plan's status changes (e.g. pending to in progress).`,
    id: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
    label: 'Plan status changed',
  },
  {
    defaultSubscribed: true,
    description: `When work is queued for a plan (e.g. new background job).`,
    id: NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED,
    label: 'Plan enqueued',
  },
  {
    defaultSubscribed: false,
    description: `When a plan is waiting on a local worktree or sync.`,
    id: NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
    label: 'Plan waiting for worktree',
  },
  {
    defaultSubscribed: true,
    description: `When a task you follow is marked complete.`,
    id: NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
    label: 'Task completed',
  },
  {
    defaultSubscribed: true,
    description: `When a task's status changes (e.g. blocked or in progress).`,
    id: NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
    label: 'Task status changed',
  },
  {
    defaultSubscribed: true,
    description: `When a queue job finishes successfully or fails.`,
    id: NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
    label: 'Queue job completed',
  },
  {
    defaultSubscribed: true,
    description: `System-wide alerts and operational messages.`,
    id: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    label: 'System alerts',
  },
  {
    defaultSubscribed: false,
    description: `Verbose diagnostic events (usually for development).`,
    id: NOTIFICATION_EVENT_NAMES.DEBUG,
    label: 'Debug',
  },
] as const;

export type EventSubscriptionId =
  (typeof EVENT_SUBSCRIPTION_ROWS)[number]['id'];

/**
 * @description Strongly-typed {@link Object.fromEntries} that preserves the key
 * union, so a total {@link Record} can be built without a type assertion.
 */
function fromEntriesRecord<TKey extends string, TValue>(
  entries: ReadonlyArray<readonly [TKey, TValue]>,
): Record<TKey, TValue>;
function fromEntriesRecord(
  entries: ReadonlyArray<readonly [string, unknown]>,
): unknown {
  return Object.fromEntries(entries);
}

/**
 * @description Default subscription toggles for each known event id (from row config).
 */
export const buildInitialSubscriptions = (): Record<
  EventSubscriptionId,
  boolean
> => {
  return fromEntriesRecord(
    EVENT_SUBSCRIPTION_ROWS.map(
      (row) => [row.id, row.defaultSubscribed] as const,
    ),
  );
};
