import { NOTIFICATIONS_MAX_PERSISTED } from '../config/index';
import type { NotificationInstance } from '../types';

/** @public */
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
