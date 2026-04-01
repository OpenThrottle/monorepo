/**
 * @description Hook for reading and updating system notification preference (localStorage).
 * Used by NotificationBell footer to toggle desktop notifications and "only when background".
 */

import * as React from 'react';
import {
  getSystemNotificationsPreference,
  setSystemNotificationsPreference,
  type SystemNotificationsPreference,
} from '../utils/system-notification';

export interface UseSystemNotificationsPreferenceResult {
  readonly preference: SystemNotificationsPreference;
  readonly setPreference: (pref: SystemNotificationsPreference) => void;
}

/**
 * @description Returns current system notification preference and a setter that persists to localStorage.
 */
export function useNotificationsSystemPreferences(): UseSystemNotificationsPreferenceResult {
  const [preference, setPreferenceState] =
    React.useState<SystemNotificationsPreference>(
      getSystemNotificationsPreference,
    );

  const setPreference = React.useCallback(
    (pref: SystemNotificationsPreference) => {
      setSystemNotificationsPreference(pref);
      setPreferenceState(getSystemNotificationsPreference());
    },
    [],
  );

  return { preference, setPreference };
}
