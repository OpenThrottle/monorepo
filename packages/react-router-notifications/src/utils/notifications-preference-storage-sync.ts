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
  console.log('🟢 2', {
    key: e.key,
    newValue: e.newValue,
    oldValue: e.oldValue,
  });

  if (e.key !== null && e.key !== NOTIFICATIONS_STORAGE_KEY) return;

  console.log('🟢 🟢 🟢 onStorageEvent', e.key, e.newValue, e.oldValue);

  for (const listener of listeners) {
    listener();
  }
}

/**
 * @description Registers `listener` for cross-tab `storage` updates to the notifications
 * preference key. Returns unsubscribe; when the last listener removes, the window
 * listener is detached.
 */
export function subscribeToNotificationsPreferenceStorageEvents(
  listener: () => void,
): () => void {
  console.log('🟢 1');

  if (!IS_BROWSER) {
    return () => {};
  }

  listeners.add(listener);

  console.log('🟢 3', { listeners });

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
