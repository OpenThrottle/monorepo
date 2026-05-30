import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { Check, X } from 'lucide-react';
import {
  Button,
  cn,
  DropdownMenuItem,
} from '@openthrottle/react-router-shadcn';
import type { NotificationInstance } from '../types';
import { formatRelativeTime, formatSeverityToColor } from '../utils/formatters';

export interface NotificationItemProps {
  readonly notification: NotificationInstance;
  readonly onDismiss: () => void;
  readonly onDismissAndClose: () => void;
  readonly onMarkRead: () => void;
}

/**
 * @description Single row in the notification dropdown: message, optional link,
 * relative time, mark-read and dismiss actions.
 */
export const NotificationItem = (
  props: NotificationItemProps,
): React.ReactElement => {
  const {
    notification,
    onMarkRead,
    onDismiss,

    // We don't want to close it right now...
    onDismissAndClose: _onDismissAndClose,
  } = props;

  // Hooks

  // Setup
  const { payload, read } = notification;
  const severityColor = formatSeverityToColor(payload.severity);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DropdownMenuItem
      className="flex flex-col items-start gap-1 py-2"
      onSelect={(e) => e.preventDefault()}
    >
      <div className="flex w-full items-start gap-2">
        <div
          className={cn('mt-1.5 size-2 shrink-0 rounded-full', severityColor)}
        />
        <div className="min-w-0 flex-1 text-left">
          <p
            className={classnames(
              // 'line-clamp-2',
              read ? 'text-muted-foreground' : 'font-medium',
            )}
            data-testid={`notification-item-${notification.id}`}
          >
            {payload.message}
          </p>
          <div className="flex justify-between items-center">
            {payload.link ? (
              <Link
                className="mt-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                data-testid={`notification-item-link-${notification.id}`}
                onClick={(e) => e.stopPropagation()}
                to={payload.link}
              >
                View plan
              </Link>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </p>
          </div>

          <div className="text-xs">{JSON.stringify(notification)}</div>
        </div>

        <div className="flex shrink-0 gap-0.5">
          {!read ? (
            <Button
              aria-label="Mark as read"
              className="size-7"
              onClick={onMarkRead}
              size="icon"
              variant="ghost"
            >
              <Check className="size-4" />
            </Button>
          ) : null}

          <Button
            aria-label="Dismiss"
            className="size-7"
            onClick={onDismiss}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </DropdownMenuItem>
  );
};
