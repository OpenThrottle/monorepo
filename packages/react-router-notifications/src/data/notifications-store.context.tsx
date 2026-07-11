/**
 * @description In-memory store for received WebSocket notifications, with optional
 * localStorage persistence. Exposes list, read/unread, and dismiss state via React context.
 */

import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import {
  NOTIFICATIONS_DEDUP_WINDOW_MS,
  NOTIFICATIONS_MAX_STORED,
  NOTIFICATIONS_MAX_PERSISTED,
} from '../config/index';
import { NotificationInstance } from '../types';
import { APP_NAME } from '@openthrottle/react-router-utils';

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

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function loadFromStorage(storageKey: string): NotificationInstance[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, NOTIFICATIONS_MAX_PERSISTED)
      .filter(isStoredNotification);
  } catch {
    return [];
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStoredNotification(
  item: unknown,
): item is NotificationInstance {
  if (!isRecord(item)) return false;

  const o = item;
  if (!isRecord(o.payload)) return false;

  const payload = o.payload;
  const hasValidLink =
    payload.link === undefined || typeof payload.link === 'string';

  return (
    typeof o.id === 'string' &&
    typeof o.event === 'string' &&
    typeof payload.message === 'string' &&
    hasValidLink &&
    typeof o.read === 'boolean' &&
    typeof o.dismissed === 'boolean' &&
    typeof o.createdAt === 'string'
  );
}

export function saveToStorage(
  storageKey: string,
  notifications: NotificationInstance[],
): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave = notifications
      .filter((n) => !n.dismissed)
      .slice(-NOTIFICATIONS_MAX_PERSISTED);
    window.localStorage.setItem(storageKey, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

type NotificationsStoreAction =
  | { event: NotificationEventName; payload: NotificationPayload; type: 'add' }
  | { id: string; type: 'markRead' }
  | { type: 'markAllRead' }
  | { id: string; type: 'dismiss' }
  | { type: 'dismissAll' }
  | { notifications: NotificationInstance[]; type: 'hydrate' };

export function reducer(
  state: readonly NotificationInstance[],
  action: NotificationsStoreAction,
): NotificationInstance[] {
  switch (action.type) {
    case 'add': {
      const now = Date.now();

      // Coalesce identical re-emits (same event + message + link) that arrive
      // within NOTIFICATIONS_DEDUP_WINDOW_MS. The payload union has no stable id,
      // so dedup is content + time based; reconnect replays commonly re-deliver
      // the same events in a short window. Only the newest entry is compared —
      // older matches are intentional repeats the user already saw.
      const newest = state[0];
      if (
        newest !== undefined &&
        newest.event === action.event &&
        newest.payload.message === action.payload.message &&
        newest.payload.link === action.payload.link &&
        now - new Date(newest.createdAt).getTime() <
          NOTIFICATIONS_DEDUP_WINDOW_MS
      ) {
        return [...state];
      }

      const created: NotificationInstance = {
        createdAt: new Date(now).toISOString(),
        dismissed: false,
        event: action.event,
        id: generateId(),
        payload: action.payload,
        read: false,
      };

      const next = [created, ...state].slice(0, NOTIFICATIONS_MAX_STORED);

      return next;
    }

    case 'dismiss': {
      return state.map((n) =>
        n.id === action.id ? { ...n, dismissed: true, read: true } : n,
      );
    }

    case 'dismissAll': {
      return state.map((n) => ({ ...n, dismissed: true, read: true }));
    }

    case 'hydrate': {
      return action.notifications.slice(0, NOTIFICATIONS_MAX_STORED);
    }

    case 'markAllRead': {
      return state.map((n) => ({ ...n, read: true }));
    }

    case 'markRead': {
      return state.map((n) => (n.id === action.id ? { ...n, read: true } : n));
    }

    default:
      return [...state];
  }
}

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

/**
 * Maps notification severity to sonner toast method; optional action to open payload.link.
 *
 * @public
 */
export function toastForNotification(
  payload: NotificationPayload,
  navigate?: (path: string) => void,
): void {
  let method: keyof typeof toast = 'info';

  switch (payload.severity) {
    case 'error':
      method = 'error';
      break;
    case 'success':
      method = 'success';
      break;
    case 'info':
      method = 'info';
      break;
    case 'warning':
      method = 'warning';
      break;
  }

  const action =
    payload.link && navigate
      ? { label: 'View', onClick: () => navigate(payload.link!) }
      : undefined;

  toast[method](payload.message, action !== undefined ? { action } : undefined);
}
