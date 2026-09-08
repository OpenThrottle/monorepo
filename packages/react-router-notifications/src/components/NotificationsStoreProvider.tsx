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
  // Always start empty so the first client render matches the server-rendered
  // HTML. Reading localStorage in the lazy initializer made SSR render no unread
  // badge while the hydration render rendered one, which React reports as
  // "Hydration failed" and which detaches event handlers in the affected
  // subtree. Persisted notifications are restored in a mount effect below.
  const [state, dispatch] = React.useReducer(reducer, []);
  const [hydrated, setHydrated] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    severity: NotificationPayload['severity'];
  } | null>(null);

  // Setup
  // Tracks the newest notification id already announced so hydration / read /
  // dismiss reducer passes (which keep the head id stable) never re-announce.
  const lastAnnouncedIdRef = React.useRef<string | null>(null);

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
  // Restore persisted notifications after mount, never during the first render.
  // `lastAnnouncedIdRef` is primed before dispatching so the restored head is
  // not re-announced to screen readers on every page load.
  React.useEffect(() => {
    if (!persist) {
      setHydrated(true);
      return;
    }

    const restored = loadFromStorage(resolvedStorageKey);
    lastAnnouncedIdRef.current = restored[0]?.id ?? null;
    dispatch({ notifications: restored, type: 'hydrate' });
    setHydrated(true);
  }, [persist, resolvedStorageKey]);

  // Gated on `hydrated` so the empty initial state is never written back over
  // the persisted list before it has been restored.
  React.useEffect(() => {
    if (persist && hydrated) saveToStorage(resolvedStorageKey, state);
  }, [hydrated, persist, resolvedStorageKey, state]);

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
