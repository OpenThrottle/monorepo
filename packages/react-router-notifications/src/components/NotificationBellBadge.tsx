import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface NotificationBellBadgeProps {
  readonly unreadCount: number;
}

/**
 * @description Unread-count badge pinned to the bell trigger; renders nothing
 * when there are no unread notifications.
 *
 * @public
 */
export const NotificationBellBadge = (
  props: NotificationBellBadgeProps,
): React.ReactElement | null => {
  const { unreadCount } = props;

  // Hooks

  // Setup
  const count = unreadCount > 99 ? '99+' : unreadCount;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (unreadCount <= 0) {
    return null;
  }

  return (
    <Badge
      className="absolute -top-1 -right-1 size-4 rounded-full p-0 text-[10px]"
      color="orange"
      data-testid="notification-bell-badge"
      size="xs"
    >
      {count}
    </Badge>
  );
};
