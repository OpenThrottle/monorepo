import * as React from 'react';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES } from './event-options';
import type { WebsocketDebuggerSocket } from './types';

export type WebsocketDebuggerEventSubscriber = (
  listener: (
    event: NotificationEventName,
    payload: NotificationPayload,
  ) => void,
) => () => void;

export interface UseWebsocketDebuggerSocketSubscriptionOptions {
  readonly append: (
    event: NotificationEventName,
    payload: NotificationPayload,
  ) => void;
  readonly enabled?: boolean;
  /** @description Standalone / Storybook: attach listeners on this socket when `subscribeToEvents` is omitted. */
  readonly socket?: WebsocketDebuggerSocket | null | undefined;
  /**
   * @description Transport-agnostic event fan-out (e.g. a graphql-ws subscription bridge).
   * When set, `socket` is not used for event listening.
   */
  readonly subscribeToEvents?: WebsocketDebuggerEventSubscriber;
}

/**
 * @description Appends notification events to the debugger log. Prefer the
 * transport-agnostic `subscribeToEvents` fan-out; the raw `socket` path exists for
 * standalone/Storybook usage.
 */
export const useWebsocketDebuggerSocketSubscription = (
  options: UseWebsocketDebuggerSocketSubscriptionOptions,
): void => {
  const { append, enabled = true, socket, subscribeToEvents } = options;
  const appendRef = React.useRef(append);

  appendRef.current = append;

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (subscribeToEvents != null) {
      return subscribeToEvents((event, payload) => {
        appendRef.current(event, payload);
      });
    }

    if (socket == null) {
      return undefined;
    }

    const handlers = WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES.map((eventName) => {
      const handler = (payload: NotificationPayload): void => {
        appendRef.current(eventName, payload);
      };

      socket.on(eventName, handler);

      return () => {
        socket.off(eventName, handler);
      };
    });

    return () => {
      handlers.forEach((unsubscribe) => unsubscribe());
    };
  }, [enabled, socket, subscribeToEvents]);
};
