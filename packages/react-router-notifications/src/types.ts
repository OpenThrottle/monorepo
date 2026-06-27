import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';

/** @publicApi */
export interface NotificationInstance {
  /** ISO 8601 when the app received the notification. */
  readonly createdAt: string;
  readonly dismissed: boolean;
  readonly event: NotificationEventName;
  readonly id: string;
  readonly payload: NotificationPayload;
  readonly read: boolean;
}

/**
 * Permission state: API supported and permission result, or unsupported (no API / not secure).
 *
 * @publicApi
 */
export type NotificationPermissionState =
  | 'default'
  | 'denied'
  | 'granted'
  | 'unsupported';

/**
 * Connection status for the notifications socket.
 *
 * @publicApi
 */
export type NotificationSocketStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

/**
 * @description Listener invoked for each Socket.IO notification event (shared socket fan-out).
 *
 * @publicApi
 */
export type NotificationSocketEventListener = (
  event: NotificationEventName,
  payload: NotificationPayload,
) => void;
