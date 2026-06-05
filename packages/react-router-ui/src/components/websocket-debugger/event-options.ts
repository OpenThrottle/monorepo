import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationEventName,
} from '@openthrottle/openthrottle-notifications';

/**
 * @description Multiselect option for filtering debugger events by Socket.IO event name.
 */
export interface WebsocketDebuggerEventOption {
  readonly label: string;
  readonly value: NotificationEventName;
}

/**
 * @description Human labels for notification events (aligned with developer app
 * {@link EVENT_SUBSCRIPTION_ROWS} where applicable).
 */
export const WEBSOCKET_DEBUGGER_EVENT_OPTIONS: readonly WebsocketDebuggerEventOption[] =
  [
    {
      label: 'Plan updated',
      value: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    },
    {
      label: 'Plan status changed',
      value: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
    },
    {
      label: 'Plan enqueued',
      value: NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED,
    },
    {
      label: 'Plan waiting for worktree',
      value: NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
    },
    {
      label: 'Task completed',
      value: NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
    },
    {
      label: 'Task status changed',
      value: NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
    },
    {
      label: 'Queue job completed',
      value: NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
    },
    {
      label: 'System alerts',
      value: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    },
    {
      label: 'Debug',
      value: NOTIFICATION_EVENT_NAMES.DEBUG,
    },
  ];

/**
 * @description All event names available in the debugger filter (default selection).
 */
export const WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES: readonly NotificationEventName[] =
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => option.value);
