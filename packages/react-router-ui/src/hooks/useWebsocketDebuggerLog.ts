import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import * as React from 'react';

import { WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES } from '../components/websocket-debugger/event-options';
import type { WebsocketDebuggerLogEntry } from '../components/websocket-debugger/types';
import { WEBSOCKET_DEBUGGER_LOG_CAP } from '../components/websocket-debugger/types';
import { createWebsocketDebuggerLogEntryId } from '../utils/create-websocket-debugger-log-entry-id';

export interface UseWebsocketDebuggerLogOptions {
  /** @description Max entries to retain (default {@link WEBSOCKET_DEBUGGER_LOG_CAP}). */
  readonly cap?: number;
  /**
   * @description Initial multiselect filter. Defaults to all known event names.
   */
  readonly initialSelectedEventNames?: readonly NotificationEventName[];
}

export interface UseWebsocketDebuggerLogResult {
  readonly append: (
    event: NotificationEventName,
    payload: NotificationPayload,
  ) => void;
  readonly clear: () => void;
  readonly entries: readonly WebsocketDebuggerLogEntry[];
  readonly selectedEventNames: readonly NotificationEventName[];
  readonly setSelectedEventNames: (
    names: readonly NotificationEventName[],
  ) => void;
}

/**
 * @description Append-only log buffer for Socket.IO notification events with cap and filter.
 */
export const useWebsocketDebuggerLog = (
  options: UseWebsocketDebuggerLogOptions = {},
): UseWebsocketDebuggerLogResult => {
  const cap = options.cap ?? WEBSOCKET_DEBUGGER_LOG_CAP;

  // Hooks
  const [entries, setEntries] = React.useState<
    readonly WebsocketDebuggerLogEntry[]
  >([]);
  const [selectedEventNames, setSelectedEventNamesState] = React.useState<
    readonly NotificationEventName[]
  >(
    () =>
      options.initialSelectedEventNames ?? WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
  );

  // Setup

  // Handlers
  const setSelectedEventNames = React.useCallback(
    (names: readonly NotificationEventName[]) => {
      setSelectedEventNamesState([...names]);
    },
    [],
  );

  const append = React.useCallback(
    (event: NotificationEventName, payload: NotificationPayload) => {
      const entry: WebsocketDebuggerLogEntry = {
        event,
        id: createWebsocketDebuggerLogEntryId(),
        payload,
        receivedAt: new Date().toISOString(),
      };

      setEntries((previous) => [entry, ...previous].slice(0, cap));
    },
    [cap],
  );

  const clear = React.useCallback(() => {
    setEntries([]);
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    append,
    clear,
    entries,
    selectedEventNames,
    setSelectedEventNames,
  };
};
