import type { NotificationSocketEventListener } from '../types';

export interface NotificationSocketSubscriberRegistry {
  readonly notify: NotificationSocketEventListener;
  readonly subscribe: (listener: NotificationSocketEventListener) => () => void;
}

/**
 * @description In-memory fan-out for notification events from one Socket.IO listener set.
 */
export const createNotificationSocketSubscriberRegistry =
  (): NotificationSocketSubscriberRegistry => {
    const listeners = new Set<NotificationSocketEventListener>();

    return {
      notify: (event, payload) => {
        listeners.forEach((listener) => {
          listener(event, payload);
        });
      },
      subscribe: (listener) => {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    };
  };
