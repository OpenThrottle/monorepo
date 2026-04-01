/**
 * @description Persistence keys and related constants for system (desktop) notification
 * user preference (localStorage). Consumed by `system-notification` utils and the
 * preference UI (e.g. NotificationBell footer).
 */

import { APP_NAME } from '@openthrottle/react-router-utils';
import {
  NOTIFICATION_EVENT_NAMES,
  NotificationEventName,
} from '@openthrottle/openthrottle-notifications';

export const NOTIFICATIONS_MAX_STORED = 100;
export const NOTIFICATIONS_MAX_PERSISTED = 50;

/**
 * @description localStorage key for system notification preferences (used by preference UI).
 */
export const NOTIFICATIONS_STORAGE_KEY = `${APP_NAME}:notifications`;

/**
 * @description Socket.IO events to subscribe to (mirrors {@link NOTIFICATION_EVENT_NAMES}).
 * Listed explicitly to avoid type assertions; add entries when new notification events ship.
 */
export const NOTIFICATIONS_SOCKET_EVENTS: readonly NotificationEventName[] = [
  NOTIFICATION_EVENT_NAMES.DEBUG,
  NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED,
  NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
  NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
  NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
  NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
  NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
  NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
  NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
];
