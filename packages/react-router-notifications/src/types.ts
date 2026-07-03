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
