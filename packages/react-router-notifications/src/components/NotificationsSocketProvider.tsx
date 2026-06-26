import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import {
  NotificationsSocketContext,
  NotificationsSocketContextValue,
} from '../components/NotificationsSocketContext';
import { NOTIFICATIONS_SOCKET_EVENTS } from '../config/index';
import { NotificationSocketStatus } from '../types';
import { createNotificationSocketSubscriberRegistry } from '../utils/notification-socket-subscribers';

export interface NotificationsSocketProviderProps {
  readonly children: React.ReactNode;
  /** Optional: called when any notification event is received (for store/UI). */
  readonly onNotification?: (
    event: NotificationEventName,
    payload: NotificationPayload,
  ) => void;
  readonly webSocketUrl: string;
}

/** @publicApi */
export const NotificationsSocketProvider = (
  props: NotificationsSocketProviderProps,
): React.ReactElement => {
  const { children, onNotification, webSocketUrl } = props;

  // Hooks
  const onNotificationRef = React.useRef(onNotification);
  const subscriberRegistryRef = React.useRef(
    createNotificationSocketSubscriberRegistry(),
  );
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [status, setStatus] = React.useState<NotificationSocketStatus>('disconnected'); // prettier-ignore

  // Setup
  onNotificationRef.current = onNotification;

  const subscribeToNotifications = React.useMemo(
    () => subscriberRegistryRef.current.subscribe,
    [],
  );

  const value: NotificationsSocketContextValue = React.useMemo(
    () => ({ socket, status, subscribeToNotifications }),
    [socket, status, subscribeToNotifications],
  );

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!IS_BROWSER || !webSocketUrl) return;

    setStatus('connecting');

    const s = io(webSocketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    setSocket(s);

    const handleConnect = (): void => setStatus('connected');
    const handleDisconnect = (): void => setStatus('disconnected');
    const handleConnectError = (): void => setStatus('error');
    const handleReconnectAttempt = (): void => setStatus('reconnecting');

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.on('connect_error', handleConnectError);
    // `reconnect_attempt` is a Manager event in socket.io-client v4, not a socket
    // event — register it on `s.io`, otherwise `'reconnecting'` is never set.
    s.io.on('reconnect_attempt', handleReconnectAttempt);

    const unsubscribes = NOTIFICATIONS_SOCKET_EVENTS.map((eventName) => {
      const handler = (payload: NotificationPayload): void => {
        onNotificationRef.current?.(eventName, payload);
        subscriberRegistryRef.current.notify(eventName, payload);
      };

      s.on(eventName, handler);

      return () => s.off(eventName, handler);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());

      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('connect_error', handleConnectError);
      s.io.off('reconnect_attempt', handleReconnectAttempt);

      s.removeAllListeners();
      s.disconnect();

      setSocket(null);
      setStatus('disconnected');
    };
  }, [webSocketUrl]);

  // 🔌 Short Circuit

  return (
    <NotificationsSocketContext.Provider value={value}>
      {children}
    </NotificationsSocketContext.Provider>
  );
};
