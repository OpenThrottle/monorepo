/**
 * @description Persistence keys and related constants for system (desktop) notification
 * user preference (localStorage). Consumed by `system-notification` utils and the
 * preference UI (e.g. NotificationBell footer).
 */

import { APP_NAME } from '@openthrottle/react-router-utils';

/** @public */
export const NOTIFICATIONS_MAX_STORED = 100;
/** @public */
export const NOTIFICATIONS_MAX_PERSISTED = 50;

/**
 * @description Window (ms) within which an identical re-emitted notification (same
 * `event` + `message` + `link`) is coalesced instead of stacking a duplicate entry.
 * The payload union carries no stable id, so dedup is content + time based; reconnect
 * replays commonly re-deliver the same events within a short window.
 *
 * @public
 */
export const NOTIFICATIONS_DEDUP_WINDOW_MS = 5000;

/**
 * @description localStorage key for the system notification **preference** object
 * (`{ enabled, onlyWhenBackground }`). Distinct from the notification **list** key
 * (`DEFAULT_NOTIFICATIONS_STORAGE_KEY` = `${APP_NAME}:notifications`) so the two writers
 * never clobber each other.
 *
 * @public
 */
export const NOTIFICATIONS_STORAGE_KEY = `${APP_NAME}:notifications:prefs`;
