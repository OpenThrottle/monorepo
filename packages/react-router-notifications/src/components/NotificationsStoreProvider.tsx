import {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import * as React from 'react';
import {
  DEFAULT_NOTIFICATIONS_STORAGE_KEY,
  loadFromStorage,
  NotificationsStoreContext,
  NotificationsStoreContextValue,
  reducer,
  saveToStorage,
} from '../data';

interface NotificationsStoreProviderProps {
  readonly children: React.ReactNode;
  /** If true, persist notifications to localStorage and rehydrate on mount. */
  readonly persist?: boolean;
  readonly storageKey?: string;
}

/**
 * @description Provider that holds notifications state (in-memory, optional localStorage).
 * Does not connect to WebSocket; use with NotificationsSocketProvider and onNotification.
 */
export function NotificationsStoreProvider(
  props: NotificationsStoreProviderProps,
): React.ReactElement {
  const { children, persist = true, storageKey } = props;
  const resolvedStorageKey = storageKey ?? DEFAULT_NOTIFICATIONS_STORAGE_KEY;

  // Hooks
  const [state, dispatch] = React.useReducer(reducer, [], (initial) =>
    persist ? loadFromStorage(resolvedStorageKey) : initial,
  );

  // Setup

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
      {children}
    </NotificationsStoreContext.Provider>
  );
}
