import type {
  NotificationEventName,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';

/**
 * @description Minimal Socket.IO client surface used for standalone debugger mode.
 */
export interface WebsocketDebuggerSocket {
  off(event: string, handler: (payload: NotificationPayload) => void): void;
  on(event: string, handler: (payload: NotificationPayload) => void): void;
}

/** @description Maximum number of log entries retained in the debugger buffer. */
export const WEBSOCKET_DEBUGGER_LOG_CAP = 200;

/**
 * @description One Socket.IO notification captured for the live debugger feed.
 */
export interface WebsocketDebuggerLogEntry {
  readonly event: NotificationEventName;
  readonly id: string;
  readonly payload: NotificationPayload;
  /** ISO 8601 timestamp when the entry was recorded in the client. */
  readonly receivedAt: string;
}
