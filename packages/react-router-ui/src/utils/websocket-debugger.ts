import type { NotificationPayload } from '@openthrottle/openthrottle-notifications';

import type { WebsocketDebuggerConnectionStatus } from '../types';

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

/**
 * @description Tailwind background class for the debugger header's connection-status chip.
 */
export const formatWebsocketDebuggerStatusColor = (
  status: WebsocketDebuggerConnectionStatus,
): string => {
  switch (status) {
    case 'connected':
      return 'bg-green-500';

    case 'connecting':
    case 'reconnecting':
      return 'bg-amber-500';

    case 'disconnected':
    case 'error':
      return 'bg-red-500';

    default:
      return 'bg-amber-500';
  }
};
