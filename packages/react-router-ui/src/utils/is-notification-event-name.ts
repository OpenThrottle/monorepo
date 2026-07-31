/**
 * @description Type guard narrowing a raw string (e.g. a MultiSelect value) to
 * a known {@link NotificationEventName}. Hoisted out of
 * OpenThrottleWebsocketDebugger per component-primitive-shape R4.
 */

import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';
import { WEBSOCKET_DEBUGGER_EVENT_OPTIONS } from '../components/websocket-debugger';

const KNOWN_EVENT_NAMES = new Set<string>(
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => option.value),
);

export const isNotificationEventName = (
  value: string,
): value is NotificationEventName => KNOWN_EVENT_NAMES.has(value);
