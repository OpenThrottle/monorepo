import * as React from 'react';
import { useNavigate } from 'react-router';
import {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { NotificationsSocketProvider } from '../components/NotificationsSocketProvider';
import { toastForNotification } from '../data/index';
import { useNotificationsStore } from '../hooks/useNotificationsStore';
import {
  getSystemNotificationsPreference,
  showSystemNotification,
} from '../utils/index';

/**
 * @description Wires {@link NotificationsSocketProvider} to the notifications store,
 * toasts, and {@link showSystemNotification}. Preference **values** are not stored in
 * React here: {@link showSystemNotification} reads {@link getSystemNotificationsPreference}
 * on each incoming event. On mount this bridge runs a one-time read so prefs are parsed
 * at the WebSocket boundary before the first event. UI toggles and cross-tab sync live in
 * {@link useNotificationsSystemPreferences} (NotificationBell) — see that hook’s module doc.
 */
export interface NotificationsSocketBridgeProps {
  readonly children: React.ReactNode;
  readonly webSocketUrl: string;
}

export const NotificationsSocketBridge = (
  props: NotificationsSocketBridgeProps,
) => {
  const { children, webSocketUrl } = props;

  // Hooks
  const { addNotification } = useNotificationsStore();
  const navigate = useNavigate();

  // Setup

  // Handlers
  const onNotification = React.useCallback(
    (event: NotificationEventName, payload: NotificationPayload) => {
      addNotification(event, payload);
      toastForNotification(payload, navigate);
      showSystemNotification(event, payload, navigate);
    },
    [addNotification, navigate],
  );

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    if (!IS_BROWSER) return;
    getSystemNotificationsPreference();
  }, []);

  // 🔌 Short Circuit

  return (
    <NotificationsSocketProvider
      data-testid="NotificationsSocketBridge"
      onNotification={onNotification}
      webSocketUrl={webSocketUrl}
    >
      {children}
    </NotificationsSocketProvider>
  );
};
