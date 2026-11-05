/**
 * @description In-memory store for received WebSocket notifications, with optional
 * localStorage persistence. Exposes list, read/unread, and dismiss state via React context.
 */

import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { APP_NAME } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { NotificationInstance } from '../types';

/**
 * @description Default localStorage key for the persisted notification **list** (array).
 * Distinct from the system-notification **preference** key
 * (`NOTIFICATIONS_STORAGE_KEY` = `${APP_NAME}:notifications:prefs`) so the two writers
 * never clobber each other. Apps migrating from an older key may pass
 * {@link NotificationsStoreProviderProps.storageKey}.
 *
 * @public
 */
export const DEFAULT_NOTIFICATIONS_STORAGE_KEY = `${APP_NAME}:notifications`;

/** @public */
export type NotificationsStoreAction =
  | { event: NotificationEventName; payload: NotificationPayload; type: 'add' }
  | { id: string; type: 'markRead' }
  | { type: 'markAllRead' }
  | { id: string; type: 'dismiss' }
  | { type: 'dismissAll' }
  | { notifications: NotificationInstance[]; type: 'hydrate' };

/** @public */
export interface NotificationsStoreContextValue {
  /** Add a notification (e.g. from WebSocket handler). */
  readonly addNotification: (
    event: NotificationEventName,
    payload: NotificationPayload,
  ) => void;
  readonly dismiss: (id: string) => void;
  readonly dismissAll: () => void;
  readonly markAllAsRead: () => void;
  readonly markAsRead: (id: string) => void;
  /** All notifications (newest first). Exclude dismissed in UI if desired. */
  readonly notifications: readonly NotificationInstance[];
  readonly unreadCount: number;
  /** Notifications that are not dismissed (for bell list / badges). */
  readonly visibleNotifications: readonly NotificationInstance[];
}

/** @public */
export const NotificationsStoreContext =
  React.createContext<NotificationsStoreContextValue | null>(null);
