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
  NOTIFICATIONS_MAX_STORED,
  NOTIFICATIONS_MAX_PERSISTED,
} from '../config/index';
import { NotificationInstance } from '../types';

/**
 * @description Default localStorage key for persisted notifications. Apps migrating from
 * an older key may pass {@link NotificationsStoreProviderProps.storageKey}.
 */
export const DEFAULT_NOTIFICATIONS_STORAGE_KEY = `@openthrottle/react-router-notifications:notifications`;

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
  | { type: 'add'; event: NotificationEventName; payload: NotificationPayload }
  | { type: 'markRead'; id: string }
  | { type: 'markAllRead' }
  | { type: 'dismiss'; id: string }
  | { type: 'dismissAll' }
  | { type: 'hydrate'; notifications: NotificationInstance[] };

export function reducer(
  state: readonly NotificationInstance[],
  action: NotificationsStoreAction,
): NotificationInstance[] {
  switch (action.type) {
    case 'add': {
      const created: NotificationInstance = {
        createdAt: new Date().toISOString(),
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

export const NotificationsStoreContext =
  React.createContext<NotificationsStoreContextValue | null>(null);

/** Maps notification severity to sonner toast method; optional action to open payload.link. */
export function toastForNotification(
  payload: NotificationPayload,
  navigate?: (path: string) => void,
): void {
  const method =
    payload.severity === 'error'
      ? 'error'
      : payload.severity === 'warning'
        ? 'warning'
        : payload.severity === 'success'
          ? 'success'
          : 'info';
  const action =
    payload.link && navigate
      ? { label: 'View', onClick: () => navigate(payload.link!) }
      : undefined;
  toast[method](payload.message, action !== undefined ? { action } : undefined);
}
