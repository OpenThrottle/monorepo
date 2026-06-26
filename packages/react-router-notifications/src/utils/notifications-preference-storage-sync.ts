/**
 * @description Single window `storage` listener for the notifications preference key
 * ({@link NOTIFICATIONS_STORAGE_KEY}). Used by {@link useNotificationsSystemPreferences}
 * for cross-tab UI sync. {@link showSystemNotification} continues to read localStorage on
 * each WS event.
 */

import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { NOTIFICATIONS_STORAGE_KEY } from '../config/index';

const listeners = new Set<() => void>();
let windowListenerAttached = false;

function onStorageEvent(e: StorageEvent): void {
  if (e.key !== null && e.key !== NOTIFICATIONS_STORAGE_KEY) return;

  for (const listener of listeners) {
    listener();
  }
}

/**
 * @description Registers `listener` for cross-tab `storage` updates to the notifications
 * preference key. Returns unsubscribe; when the last listener removes, the window
 * listener is detached.
 *
 * @publicApi
 */
export function subscribeToNotificationsPreferenceStorageEvents(
  listener: () => void,
): () => void {
  if (!IS_BROWSER) {
    return () => {};
  }

  listeners.add(listener);

  if (!windowListenerAttached) {
    window.addEventListener('storage', onStorageEvent);
    windowListenerAttached = true;
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && windowListenerAttached) {
      window.removeEventListener('storage', onStorageEvent);
      windowListenerAttached = false;
    }
  };
}
