import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Bell } from 'lucide-react';
import * as React from 'react';

import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { useNotificationsStoreOptional } from '../hooks/useNotificationsStoreOptional';
import { useNotificationsSystemPreferences } from '../hooks/useNotificationsSystemPreferences';
import { NotificationActions } from './NotificationActions';
import { NotificationBellBadge } from './NotificationBellBadge';
import { NotificationList } from './NotificationList';
import { NotificationSystemPreferences } from './NotificationSystemPreferences';

export interface NotificationBellProps {}

/**
 * @description Notification bell with dropdown list. Shows unread count badge;
 * dropdown lists visible notifications with mark-as-read and dismiss actions.
 *
 * @public
 */
export const NotificationBell = (
  _props: NotificationBellProps,
): React.ReactElement | null => {
  // const { className } = _props;

  // Hooks
  const store = useNotificationsStoreOptional();
  const { permission, requestPermission } = useNotificationPermission();
  const { preference, setPreference } = useNotificationsSystemPreferences();
  const [open, setOpen] = React.useState(false);

  // Setup

  // Handlers
  const handleClose = (): void => {
    setOpen(false);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (store === null) {
    return null;
  }

  const {
    dismiss,
    dismissAll,
    markAllAsRead,
    markAsRead,
    unreadCount,
    visibleNotifications,
  } = store;

  const hasAny = visibleNotifications.length > 0;
  const unreadLabel = `${unreadCount} unread notifications`;
  const bellLabel = unreadCount > 0 ? unreadLabel : 'Notifications';

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label={bellLabel}
          className="relative size-6 shrink-0 rounded-full pointer-coarse:size-11"
          data-testid="notification-bell-trigger"
          variant="ghost"
        >
          <Bell className="size-4" />

          <NotificationBellBadge unreadCount={unreadCount} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="max-h-[min(24rem,70vh)] w-80 overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <NotificationActions
            dismissAll={dismissAll}
            hasAny={hasAny}
            markAllAsRead={markAllAsRead}
            setOpen={setOpen}
          />
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <NotificationList
          dismiss={dismiss}
          markAsRead={markAsRead}
          notifications={visibleNotifications}
          onClose={handleClose}
        />
        <DropdownMenuSeparator />
        <div
          className="space-y-3 px-2 py-3"
          data-testid="notification-bell-system-prefs"
          onClick={(e) => e.stopPropagation()}
        >
          <NotificationSystemPreferences
            permission={permission}
            preference={preference}
            requestPermission={requestPermission}
            setPreference={setPreference}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
