import * as React from 'react';
import { Bell } from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Switch,
} from '@openthrottle/react-router-shadcn';
import { useNotificationsStoreOptional } from '../hooks/useNotificationsStoreOptional';
import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { useNotificationsSystemPreferences } from '../hooks/use-system-notifications-preference';
import { NotificationPermissionDenied } from './NotificationPermissionDenied';
import { NotificationPermissionUnsupported } from './NotificationPermissionUnsupported';
import { NotificationActions } from './NotificationActions';
import { NotificationEmpty } from './NotificationEmpty';
import { NotificationItem } from './NotificationItem';

export interface NotificationBellProps {}

/**
 * @description Notification bell with dropdown list. Shows unread count badge;
 * dropdown lists visible notifications with mark-as-read and dismiss actions.
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
  const [requesting, setRequesting] = React.useState(false);

  // Setup

  // Handlers

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

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : 'Notifications'
          }
          className="relative size-9 shrink-0 rounded-full"
          data-testid="notification-bell-trigger"
          variant="ghost"
        >
          <Bell className="size-8" />

          {unreadCount > 0 ? (
            <Badge
              className="absolute -right-1 -top-1 size-4 rounded-full p-0 text-[10px] items-center justify-center font-medium"
              data-testid="notification-bell-badge"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[min(24rem,70vh)] overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {hasAny ? (
            <NotificationActions
              dismissAll={dismissAll}
              markAllAsRead={markAllAsRead}
              setOpen={setOpen}
            />
          ) : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {hasAny ? (
          visibleNotifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onDismiss={() => {
                dismiss(n.id);
              }}
              onDismissAndClose={() => {
                dismiss(n.id);
                setOpen(false);
              }}
              onMarkRead={() => markAsRead(n.id)}
            />
          ))
        ) : (
          <NotificationEmpty />
        )}
        <DropdownMenuSeparator />
        <div
          className="space-y-3 border-t border-border px-2 py-3"
          data-testid="notification-bell-system-prefs"
          onClick={(e) => e.stopPropagation()}
        >
          {permission === 'unsupported' ? (
            <NotificationPermissionUnsupported />
          ) : permission === 'denied' ? (
            <NotificationPermissionDenied />
          ) : permission === 'default' ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                data-testid="notification-bell-enable-desktop"
                disabled={requesting}
                onClick={async () => {
                  setRequesting(true);
                  await requestPermission();
                  setRequesting(false);
                }}
                size="sm"
                variant="secondary"
              >
                {requesting ? 'Requesting…' : 'Enable desktop notifications'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Allow in the browser prompt to receive notifications when the
                tab is in the background.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <Label
                  className="cursor-pointer text-sm font-normal"
                  htmlFor="system-notifications-enabled"
                >
                  Desktop notifications
                </Label>
                <Switch
                  checked={preference.enabled}
                  id="system-notifications-enabled"
                  onCheckedChange={(checked) =>
                    setPreference({
                      ...preference,
                      enabled: checked === true,
                      onlyWhenBackground: checked
                        ? preference.onlyWhenBackground
                        : undefined,
                    })
                  }
                />
              </div>
              {preference.enabled ? (
                <div className="flex items-center justify-between gap-2 pl-1">
                  <Label
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                    htmlFor="system-notifications-only-background"
                  >
                    Only when tab in background
                  </Label>
                  <Switch
                    checked={preference.onlyWhenBackground === true}
                    id="system-notifications-only-background"
                    onCheckedChange={(checked) =>
                      setPreference({
                        ...preference,
                        onlyWhenBackground: checked === true ? true : undefined,
                      })
                    }
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
