import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';

import type { WebsocketDebuggerLogEntry } from '../components/websocket-debugger/types';

/**
 * @description Filters log entries by selected event names. Empty selection shows none.
 * Hoisted out of `useWebsocketDebuggerLog` per hook-primitive-shape H2.
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
