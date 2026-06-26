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
 *
 * @publicApi
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
      className={cn(
        'group/notification-item flex flex-col items-start gap-1 py-2',
        'focus:bg-secondary/80',
      )}
      onSelect={(e) => e.preventDefault()}
    >
      <div className="flex w-full flex-1 items-start items-stretch py-1">
        <div className="min-w-0 flex-1 text-left">
          <p
            className={classnames(
              'mb-1 line-clamp-2 text-xs',
              'text-muted-foreground group-hover/notification-item:text-foreground transition-colors',
              read ? 'text-muted-foreground' : 'font-medium',
            )}
            data-testid={`notification-item-${notification.id}`}
          >
            {payload.message}
          </p>

          <div className="flex items-baseline justify-between gap-2">
            <div
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                severityColor,
              )}
            />

            {payload.link ? (
              <Link
                className="text-muted-foreground mt-1 flex-1 text-xs font-medium"
                data-testid={`notification-item-link-${notification.id}`}
                onClick={(e) => e.stopPropagation()}
                to={payload.link}
              >
                View plan
              </Link>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {formatRelativeTime(notification.createdAt)}
            </p>
          </div>
        </div>

        <div
          className={classnames(
            'space-between flex justify-between',
            '-mr-4 ml-4 w-0 gap-0.5 overflow-hidden transition-all',
            'group-hover/notification-item:mr-0',
            'group-hover/notification-item:w-auto',
          )}
        >
          <div className="flex flex-col justify-between gap-2">
            {!read ? (
              <Button
                aria-label="Mark as read"
                className="text-muted-foreground hover:text-foreground size-5"
                onClick={onMarkRead}
                size="icon"
                variant="link"
              >
                <Check className="size-4" />
              </Button>
            ) : null}

            <Button
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground size-5"
              onClick={onDismiss}
              size="icon"
              variant="link"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </DropdownMenuItem>
  );
};
