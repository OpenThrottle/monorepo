/**
 * @description Hook for Web Notifications API permission state and request.
 * Handles secure context (HTTPS or localhost), browser support (window.Notification),
 * and exposes granted/denied/default for UI (e.g. "Enable desktop notifications").
 */

import * as React from 'react';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { NotificationPermissionState } from '../types';

export interface UseNotificationPermissionResult {
  /** Whether the page is in a secure context (HTTPS or localhost). */
  readonly isSecureContext: boolean;
  /** Whether the Web Notifications API is available and in a secure context. */
  readonly isSupported: boolean;
  /** Current permission: granted, denied, default (not yet asked), or unsupported. */
  readonly permission: NotificationPermissionState;
  /**
   * Requests permission. Resolves to the new permission state.
   * Call in response to user gesture (e.g. button click) for best browser behavior.
   */
  readonly requestPermission: () => Promise<NotificationPermissionState>;
}

function getPermission(): NotificationPermissionState {
  if (!IS_BROWSER) return 'unsupported';
  if (!window.isSecureContext) return 'unsupported';
  if (typeof window.Notification === 'undefined') return 'unsupported';

  const p = window.Notification.permission;
  if (p === 'granted' || p === 'denied' || p === 'default') return p;

  return 'unsupported';
}

/**
 * @description Exposes Web Notifications API permission state and a request function.
 * Use for "Enable desktop notifications" UI and to gate showing system notifications.
 */
export const useNotificationPermission =
  (): UseNotificationPermissionResult => {
    // Hooks
    const [permission, setPermission] = React.useState<NotificationPermissionState>(getPermission); // prettier-ignore

    // Setup
    const isSecureContext = IS_BROWSER && window.isSecureContext;
    const isSupported = permission !== 'unsupported';

    // Handlers
    const requestPermission =
      React.useCallback(async (): Promise<NotificationPermissionState> => {
        if (!IS_BROWSER) return 'unsupported';
        if (
          !window.isSecureContext ||
          typeof window.Notification === 'undefined'
        ) {
          setPermission('unsupported');
          return 'unsupported';
        }
        const result = await window.Notification.requestPermission();
        const next: NotificationPermissionState =
          result === 'granted' || result === 'denied' || result === 'default'
            ? result
            : 'unsupported';
        setPermission(next);
        return next;
      }, []);

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return {
      isSecureContext,
      isSupported,
      permission,
      requestPermission,
    };
  };
