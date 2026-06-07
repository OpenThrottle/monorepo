import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';

export interface NotificationActionsProps {
  readonly dismissAll: () => void;
  readonly hasAny: boolean;
  readonly markAllAsRead: () => void;
  readonly setOpen: (open: boolean) => void;
}

export const NotificationActions = (
  props: NotificationActionsProps,
): React.ReactElement => {
  const { dismissAll, hasAny, markAllAsRead, setOpen } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex gap-1 w-full" data-testid="NotificationActions">
      <Button
        className={classnames('flex-1 h-7 text-xs', { 'opacity-25!': !hasAny })}
        disabled={!hasAny}
        onClick={markAllAsRead}
        size="sm"
        variant="ghost"
      >
        Mark all read
      </Button>
      <Button
        className={classnames('flex-1 h-7 text-xs', { 'opacity-25!': !hasAny })}
        disabled={!hasAny}
        onClick={() => {
          dismissAll();
          setOpen(false);
        }}
        size="sm"
        variant="ghost"
      >
        Dismiss all
      </Button>
    </div>
  );
};
