import { IS_BROWSER } from '@openthrottle/react-router-utils';

import type { NotificationPermissionState } from '../types';

/**
 * @description Reads the current Web Notifications permission, collapsing every
 * non-usable environment (no window, insecure context, no `Notification` API,
 * unknown value) to `'unsupported'`.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!IS_BROWSER) return 'unsupported';
  if (!window.isSecureContext) return 'unsupported';
  if (typeof window.Notification === 'undefined') return 'unsupported';

  const p = window.Notification.permission;
  if (p === 'granted' || p === 'denied' || p === 'default') return p;

  return 'unsupported';
}
