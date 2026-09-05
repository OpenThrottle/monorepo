import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import * as React from 'react';
import type { NotificationsStoreContextValue } from '../data';
import {
  DEFAULT_NOTIFICATIONS_STORAGE_KEY,
  loadFromStorage,
  NotificationsStoreContext,
  reducer,
  saveToStorage,
} from '../data';
import { NotificationsAnnouncer } from './NotificationsAnnouncer';

export interface NotificationsStoreProviderProps {
  readonly children: React.ReactNode;
  /** If true, persist notifications to localStorage and rehydrate on mount. */
  readonly persist?: boolean;
  readonly storageKey?: string;
}

/**
 * @description Provider that holds notifications state (in-memory, optional localStorage).
 * Transport-agnostic: pair it with a realtime bridge (e.g. a graphql-ws subscription
 * bridge) that calls `addNotification` as events arrive.
 *
 * @public
 */
export const NotificationsStoreProvider = (
  props: NotificationsStoreProviderProps,
): React.ReactElement => {
  const { children, persist = true, storageKey } = props;
  const resolvedStorageKey = storageKey ?? DEFAULT_NOTIFICATIONS_STORAGE_KEY;

  // Hooks
  const [state, dispatch] = React.useReducer(reducer, [], (initial) =>
    persist ? loadFromStorage(resolvedStorageKey) : initial,
  );
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    severity: NotificationPayload['severity'];
  } | null>(null);

  // Setup
  // Tracks the newest notification id already announced so hydration / read /
  // dismiss reducer passes (which keep the head id stable) never re-announce.
  const lastAnnouncedIdRef = React.useRef<string | null>(
    state.length > 0 ? state[0].id : null,
  );

  // Handlers
  const addNotification = React.useCallback(
    (event: NotificationEventName, payload: NotificationPayload) => {
      dispatch({ event, payload, type: 'add' });
    },
    [],
  );

  const dismiss = React.useCallback((id: string) => {
    dispatch({ id, type: 'dismiss' });
  }, []);

  const dismissAll = React.useCallback(() => {
    dispatch({ type: 'dismissAll' });
  }, []);

  const markAsRead = React.useCallback((id: string) => {
    dispatch({ id, type: 'markRead' });
  }, []);

  const markAllAsRead = React.useCallback(() => {
    dispatch({ type: 'markAllRead' });
  }, []);

  const visibleNotifications = React.useMemo(
    () => state.filter((n) => !n.dismissed),
    [state],
  );

  const unreadCount = React.useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (persist) saveToStorage(resolvedStorageKey, state);
  }, [persist, resolvedStorageKey, state]);

  React.useEffect(() => {
    const newest = state[0];
    if (newest === undefined) return;
    if (newest.id === lastAnnouncedIdRef.current) return;

    lastAnnouncedIdRef.current = newest.id;
    setAnnouncement({
      message: newest.payload.message,
      severity: newest.payload.severity,
    });
  }, [state]);

  const value: NotificationsStoreContextValue = React.useMemo(
    () => ({
      addNotification,
      dismiss,
      dismissAll,
      markAllAsRead,
      markAsRead,
      notifications: state,
      unreadCount,
      visibleNotifications,
    }),
    [
      state,
      addNotification,
      markAsRead,
      markAllAsRead,
      dismiss,
      dismissAll,
      visibleNotifications,
      unreadCount,
    ],
  );

  // 🔌 Short Circuit

  return (
    <NotificationsStoreContext.Provider value={value}>
      <NotificationsAnnouncer
        message={announcement?.message ?? null}
        severity={announcement?.severity ?? null}
      />
      {children}
    </NotificationsStoreContext.Provider>
  );
};
