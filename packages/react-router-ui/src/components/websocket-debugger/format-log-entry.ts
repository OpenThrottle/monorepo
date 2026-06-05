import type { NotificationPayload } from '@openthrottle/openthrottle-notifications';

/**
 * @description Formats a notification payload for monospace display in the debugger.
 */
export const formatWebsocketDebuggerPayload = (
  payload: NotificationPayload,
): string => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

/**
 * @description Short local time label for a log entry timestamp.
 */
export const formatWebsocketDebuggerReceivedAt = (
  receivedAt: string,
): string => {
  const date = new Date(receivedAt);

  if (Number.isNaN(date.getTime())) {
    return receivedAt;
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });
};
