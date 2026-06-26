/**
 * @description Persistence keys and related constants for system (desktop) notification
 * user preference (localStorage). Consumed by `system-notification` utils and the
 * preference UI (e.g. NotificationBell footer).
 */

import { APP_NAME } from '@openthrottle/react-router-utils';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';

/** @publicApi */
export const NOTIFICATIONS_MAX_STORED = 100;
/** @publicApi */
export const NOTIFICATIONS_MAX_PERSISTED = 50;

/**
 * @description Window (ms) within which an identical re-emitted notification (same
 * `event` + `message` + `link`) is coalesced instead of stacking a duplicate entry.
 * The payload union carries no stable id, so dedup is content + time based; reconnect
 * replays commonly re-deliver the same events within a short window.
 *
 * @publicApi
 */
export const NOTIFICATIONS_DEDUP_WINDOW_MS = 5000;

/**
 * @description localStorage key for the system notification **preference** object
 * (`{ enabled, onlyWhenBackground }`). Distinct from the notification **list** key
 * (`DEFAULT_NOTIFICATIONS_STORAGE_KEY` = `${APP_NAME}:notifications`) so the two writers
 * never clobber each other.
 *
 * @publicApi
 */
export const NOTIFICATIONS_STORAGE_KEY = `${APP_NAME}:notifications:prefs`;

/**
 * @description Socket.IO events to subscribe to (mirrors {@link NOTIFICATION_EVENT_NAMES}).
 * Listed explicitly to avoid type assertions; add entries when new notification events ship.
 *
 * Intentionally excludes the status-change events (`PLAN_STATUS_CHANGED`,
 * `TASK_STATUS_CHANGED`): their payloads are display-less revalidation signals that do NOT
 * carry `message`/`severity`/`link` and are deliberately excluded from the
 * `NotificationPayload` union. The socket provider forwards every subscribed event into the
 * notification store/toast path typed as `NotificationPayload`, so subscribing to them would
 * produce blank sonner toasts and empty notification rows. Revalidation is handled separately
 * (the live app drives it from the GraphQL subscription bridge).
 *
 * @publicApi
 */
export const NOTIFICATIONS_SOCKET_EVENTS: readonly NotificationEventName[] = [
  NOTIFICATION_EVENT_NAMES.DEBUG,
  NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED,
  NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
  NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
  NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
  NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
  NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
];
