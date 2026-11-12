import { NOTIFICATIONS_MAX_PERSISTED } from '../config/index';
import type { NotificationInstance } from '../types';
import { isStoredNotification } from './is-stored-notification';

/** @public */
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
