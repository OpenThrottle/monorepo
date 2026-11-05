import * as React from 'react';

import type { NotificationInstance } from '../types';
import { NotificationEmpty } from './NotificationEmpty';
import { NotificationItem } from './NotificationItem';

export interface NotificationListProps {
  readonly dismiss: (id: string) => void;
  readonly markAsRead: (id: string) => void;
  readonly notifications: readonly NotificationInstance[];
  readonly onClose: () => void;
}

/**
 * @description Rows of the notification dropdown, or the empty state when
 * there is nothing to show.
 *
 * @public
 */
export const NotificationList = (
  props: NotificationListProps,
): React.ReactElement => {
  const { dismiss, markAsRead, notifications, onClose } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (notifications.length === 0) {
    return <NotificationEmpty />;
  }

  return (
    <>
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onDismiss={() => {
            dismiss(n.id);
          }}
          onDismissAndClose={() => {
            dismiss(n.id);
            onClose();
          }}
          onMarkRead={() => markAsRead(n.id)}
        />
      ))}
    </>
  );
};
