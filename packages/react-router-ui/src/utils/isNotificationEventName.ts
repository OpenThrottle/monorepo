/**
 * @description Type guard narrowing a raw string (e.g. a MultiSelect value) to
 * a known {@link NotificationEventNamesValue}. Hoisted out of
 * OpenThrottleWebsocketDebugger per component-primitive-shape R4.
 */

import type { NotificationEventNamesValue } from '@openthrottle/openthrottle-notifications';

import { WEBSOCKET_DEBUGGER_EVENT_OPTIONS } from '../data/data.websocket-debugger-events';

const KNOWN_EVENT_NAMES = new Set<string>(
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => option.value),
);

export const isNotificationEventName = (
  value: string,
): value is NotificationEventNamesValue => {
  return KNOWN_EVENT_NAMES.has(value);
};
