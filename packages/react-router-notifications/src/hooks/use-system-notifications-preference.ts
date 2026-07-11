/**
 * @description Hook for reading and updating system notification preference (localStorage).
 * Used by NotificationBell footer to toggle desktop notifications and "only when background".
 *
 * ## Design: bridge integration and single source of truth (OpenThrottle plan f63ec6d5-23f2-416c-ba62-c3adaa1dea50)
 *
 * - **Authoritative storage:** {@link NOTIFICATIONS_STORAGE_KEY} in `config` — JSON
 *   `{ enabled?, onlyWhenBackground? }`. This is **not** the same key as the persisted
 *   notification **list** ({@link DEFAULT_NOTIFICATIONS_STORAGE_KEY} in the store module).
 * - **Realtime / desktop path:** {@link showSystemNotification} calls
 *   {@link getSystemNotificationsPreference} on **every** incoming event, so prefs are
 *   applied at the transport edge (the realtime bridge) without React state — no
 *   duplicate “pref state” belongs in the bridge.
 * - **This hook’s React state:** Drives NotificationBell toggles. Cross-tab updates use
 *   {@link subscribeToNotificationsPreferenceStorageEvents} (single window listener).
 *   Same-tab updates go through {@link setSystemNotificationsPreference} + `setPreference`.
 * - **Do not** mount this hook inside the realtime bridge as a second instance — that
 *   would duplicate React state. One consumer (Bell), or later a small provider wrapping
 *   the tree if multiple UIs need the same prefs.
 */

import * as React from 'react';
import { subscribeToNotificationsPreferenceStorageEvents } from '../utils/notifications-preference-storage-sync';
import {
  getSystemNotificationsPreference,
  setSystemNotificationsPreference,
  type SystemNotificationsPreference,
} from '../utils/system-notification';

/** @publicApi */
export interface UseSystemNotificationsPreferenceResult {
  readonly preference: SystemNotificationsPreference;
  readonly setPreference: (pref: SystemNotificationsPreference) => void;
}

/**
 * @description Returns current system notification preference and a setter that persists to localStorage.
 *
 * @publicApi
 */
export function useNotificationsSystemPreferences(): UseSystemNotificationsPreferenceResult {
  const [preference, setPreferenceState] =
    React.useState<SystemNotificationsPreference>(() =>
      getSystemNotificationsPreference(),
    );

  React.useEffect(() => {
    return subscribeToNotificationsPreferenceStorageEvents(() => {
      setPreferenceState(getSystemNotificationsPreference());
    });
  }, []);

  const setPreference = React.useCallback(
    (pref: SystemNotificationsPreference) => {
      setSystemNotificationsPreference(pref);
      setPreferenceState(getSystemNotificationsPreference());
    },
    [],
  );

  return { preference, setPreference };
}
