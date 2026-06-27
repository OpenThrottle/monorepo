import * as React from 'react';
import type { NotificationSocketEventListener } from '../types';
import { useNotificationsSocket } from './useNotificationsSocket';

/** @publicApi */
export interface UseNotificationsSocketEventSubscriptionOptions {
  readonly enabled?: boolean;
}

/**
 * @description Append to a debugger log (or similar) from the shared notifications socket
 * without registering duplicate `socket.on` handlers. Requires
 * {@link NotificationsSocketProvider} above in the tree.
 *
 * @publicApi
 */
export const useNotificationsSocketEventSubscription = (
  onEvent: NotificationSocketEventListener | undefined,
  options: UseNotificationsSocketEventSubscriptionOptions = {},
): void => {
  const { enabled = true } = options;
  const socketContext = useNotificationsSocket();
  const onEventRef = React.useRef(onEvent);

  onEventRef.current = onEvent;

  React.useEffect(() => {
    if (!enabled || onEventRef.current == null) {
      return undefined;
    }

    const subscribe = socketContext?.subscribeToNotifications;

    if (subscribe == null) {
      return undefined;
    }

    return subscribe((event, payload) => {
      onEventRef.current?.(event, payload);
    });
  }, [enabled, socketContext?.subscribeToNotifications]);
};
