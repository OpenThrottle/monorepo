/**
 * @description System (desktop) notifications via Web Notifications API.
 * Shows a browser/OS notification when a WebSocket notification arrives, when permission
 * is granted and user preference is enabled. Preference is persisted in task "Add user
 * preference for system notifications and tuning" (localStorage).
 */

import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { NOTIFICATIONS_STORAGE_KEY } from '../config/index';

export interface SystemNotificationsPreference {
  readonly enabled: boolean;
  /** When true, show system notification only when the tab is not focused. */
  readonly onlyWhenBackground?: boolean;
}

const DEFAULT_PREFERENCE: SystemNotificationsPreference = {
  enabled: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @description Reads system notification preference from localStorage.
 * Defaults to disabled so we only show system notifications after the user opts in.
 */
export function getSystemNotificationsPreference(): SystemNotificationsPreference {
  // console.log('🟢 6 - getSystemNotificationsPreference');

  if (!IS_BROWSER) {
    return DEFAULT_PREFERENCE;
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_PREFERENCE;

    const o = parsed;
    const enabled = o.enabled === true;
    const onlyWhenBackground = o.onlyWhenBackground === true ? true : undefined;

    // console.log('🟢 7 - ', { enabled, onlyWhenBackground });

    return { enabled, onlyWhenBackground };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/**
 * @description Writes system notification preference to localStorage.
 * Use from UI (e.g. NotificationBell footer) to persist user choices.
 */
export function setSystemNotificationsPreference(
  pref: SystemNotificationsPreference,
): void {
  if (typeof window === 'undefined') return;
  try {
    const toStore = {
      enabled: pref.enabled === true,
      onlyWhenBackground: pref.onlyWhenBackground === true ? true : undefined,
    };
    window.localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(toStore),
    );
  } catch {
    // ignore
  }
}

function isSupportedAndGranted(): boolean {
  if (!IS_BROWSER) return false;
  if (!window.isSecureContext) return false;
  const NotificationCtor = window.Notification;
  if (NotificationCtor == null) return false;

  return NotificationCtor.permission === 'granted';
}

/**
 * @description Shows a system (desktop) notification when a WS notification arrives.
 * Only runs when: API supported, permission granted, user preference enabled, and
 * (if onlyWhenBackground) tab is not visible. On click: focus window and navigate to
 * payload.link if present.
 */
export function showSystemNotification(
  event: NotificationEventName,
  payload: NotificationPayload,
  navigate?: (path: string) => void,
): void {
  if (!isSupportedAndGranted()) return;

  const pref = getSystemNotificationsPreference();
  if (!pref.enabled) return;

  if (pref.onlyWhenBackground === true) {
    if (
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'
    ) {
      return;
    }
  }

  const title = payload.message;
  const body = payload.severity ? `Severity: ${payload.severity}` : undefined;
  const tag = `openthrottle:${event}`;
  const link = payload.link;

  try {
    const notification = new window.Notification(title, {
      body,
      data: link !== undefined ? { link } : undefined,
      tag,
    });

    notification.onclick = () => {
      window.focus();
      if (link !== undefined && navigate) {
        navigate(link);
      }
      notification.close();
    };
  } catch {
    console.error('🔴 Error showing system notification', {
      event,
      navigate,
      payload,
    });

    // Ignore constructor or onclick errors (e.g. some browsers restrict behavior).
  }
}
