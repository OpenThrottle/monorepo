/**
 * @description Connection status for the debugger header chip (aligned with notifications socket).
 */
export type WebsocketDebuggerConnectionStatus =
  'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';

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
