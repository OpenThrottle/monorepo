import * as React from 'react';
import classnames from 'classnames';
import { useNotificationsSocket } from '../hooks/useNotificationsSocket';
import { formatStatusToColor } from '../utils/formatters';

export interface NotificationStatusBadgeProps {}

export const NotificationStatusBadge = (
  _props: NotificationStatusBadgeProps,
): React.ReactElement | null => {
  // Hooks
  const ctx = useNotificationsSocket();

  // Setup
  const status = ctx?.status ?? 'disconnected';
  const color = formatStatusToColor(status);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (ctx === null) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1"
      data-status={status}
      data-testid="notifications-socket-status"
      title={`WebSocket: ${status}`}
    >
      <div
        className={classnames(
          'inline-block h-2 w-2 shrink-0 rounded-full',
          color,
        )}
      />
      <span className="sr-only">WebSocket {status}</span>
    </div>
  );
};
