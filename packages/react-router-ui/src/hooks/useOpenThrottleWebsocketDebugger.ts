import * as React from 'react';
import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';
import {
  filterWebsocketDebuggerEntries,
  useWebsocketDebuggerLog,
  useWebsocketDebuggerSocketSubscription,
  WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
} from '../components/websocket-debugger';
import type {
  WebsocketDebuggerEventSubscriber,
  WebsocketDebuggerLogEntry,
  WebsocketDebuggerSocket,
} from '../components/websocket-debugger';
import { isNotificationEventName } from '../utils/is-notification-event-name';

export interface UseOpenThrottleWebsocketDebuggerOptions {
  /**
   * @description Pre-filled log rows (e.g. tests). When omitted, entries come from the socket subscription.
   */
  readonly initialEntries?: readonly WebsocketDebuggerLogEntry[];
  readonly onSelectedEventNamesChange?: (
    names: readonly NotificationEventName[],
  ) => void;
  readonly selectedEventNames?: readonly NotificationEventName[];
  /** @description Standalone / Storybook: attach listeners on this socket. */
  readonly socket?: WebsocketDebuggerSocket | null;
  readonly subscribeToEvents?: WebsocketDebuggerEventSubscriber;
  readonly subscriptionEnabled?: boolean;
}

export interface UseOpenThrottleWebsocketDebuggerResult {
  readonly displayEntries: readonly WebsocketDebuggerLogEntry[];
  readonly handleClear: () => void;
  readonly handleFilterChange: (values: string[]) => void;
  readonly selectedEventNames: readonly NotificationEventName[];
}

/**
 * @description Log buffer, controlled/uncontrolled event filter, socket
 * subscription, and initial-entry seeding for
 * {@link ../components/OpenThrottleWebsocketDebugger.tsx}. Hoisted out of the
 * component per component-primitive-shape R7.
 */
export const useOpenThrottleWebsocketDebugger = (
  options: UseOpenThrottleWebsocketDebuggerOptions,
): UseOpenThrottleWebsocketDebuggerResult => {
  const {
    initialEntries,
    onSelectedEventNamesChange,
    selectedEventNames: selectedEventNamesProp,
    socket,
    subscribeToEvents,
    subscriptionEnabled = true,
  } = options;

  // Hooks
  const {
    append,
    clear,
    entries,
    selectedEventNames: internalSelectedEventNames,
    setSelectedEventNames: setInternalSelectedEventNames,
  } = useWebsocketDebuggerLog({
    initialSelectedEventNames:
      selectedEventNamesProp ?? WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
  });

  const hasSeededInitialEntriesRef = React.useRef(false);

  useWebsocketDebuggerSocketSubscription({
    append,
    enabled: subscriptionEnabled && initialEntries == null,
    socket,
    subscribeToEvents,
  });

  // Setup
  const isFilterControlled =
    selectedEventNamesProp !== undefined &&
    onSelectedEventNamesChange !== undefined;

  const selectedEventNames = isFilterControlled
    ? selectedEventNamesProp
    : internalSelectedEventNames;

  const setSelectedEventNames = isFilterControlled
    ? onSelectedEventNamesChange
    : setInternalSelectedEventNames;

  const displayEntries = React.useMemo(
    () => filterWebsocketDebuggerEntries(entries, selectedEventNames),
    [entries, selectedEventNames],
  );

  // Handlers
  const handleFilterChange = (values: string[]): void => {
    setSelectedEventNames(values.filter(isNotificationEventName));
  };

  const handleClear = (): void => {
    clear();
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (initialEntries == null || hasSeededInitialEntriesRef.current) {
      return;
    }

    hasSeededInitialEntriesRef.current = true;

    for (const entry of [...initialEntries].reverse()) {
      append(entry.event, entry.payload);
    }
  }, [append, initialEntries]);

  // 🔌 Short Circuit

  return {
    displayEntries,
    handleClear,
    handleFilterChange,
    selectedEventNames,
  };
};
