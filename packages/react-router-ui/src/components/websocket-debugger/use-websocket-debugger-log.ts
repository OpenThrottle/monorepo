import * as React from 'react';
import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES } from './event-options';
import type { WebsocketDebuggerLogEntry } from './types';
import { WEBSOCKET_DEBUGGER_LOG_CAP } from './types';

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
  readonly filteredEntries: readonly WebsocketDebuggerLogEntry[];
  readonly selectedEventNames: readonly NotificationEventName[];
  readonly setSelectedEventNames: (
    names: readonly NotificationEventName[],
  ) => void;
}

let entryIdCounter = 0;

const createLogEntryId = (): string => {
  entryIdCounter += 1;
  return `ws-debug-${entryIdCounter}`;
};

/**
 * @description Filters log entries by selected event names. Empty selection shows none.
 */
export const filterWebsocketDebuggerEntries = (
  entries: readonly WebsocketDebuggerLogEntry[],
  selectedEventNames: readonly NotificationEventName[],
): readonly WebsocketDebuggerLogEntry[] => {
  if (selectedEventNames.length === 0) {
    return [];
  }

  const selected = new Set(selectedEventNames);

  return entries.filter((entry) => selected.has(entry.event));
};

/**
 * @description Append-only log buffer for Socket.IO notification events with cap and filter.
 */
export const useWebsocketDebuggerLog = (
  options: UseWebsocketDebuggerLogOptions = {},
): UseWebsocketDebuggerLogResult => {
  const cap = options.cap ?? WEBSOCKET_DEBUGGER_LOG_CAP;
  const [entries, setEntries] = React.useState<
    readonly WebsocketDebuggerLogEntry[]
  >([]);
  const [selectedEventNames, setSelectedEventNamesState] = React.useState<
    readonly NotificationEventName[]
  >(
    () =>
      options.initialSelectedEventNames ?? WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
  );

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
        id: createLogEntryId(),
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

  const filteredEntries = React.useMemo(
    () => filterWebsocketDebuggerEntries(entries, selectedEventNames),
    [entries, selectedEventNames],
  );

  return {
    append,
    clear,
    entries,
    filteredEntries,
    selectedEventNames,
    setSelectedEventNames,
  };
};
