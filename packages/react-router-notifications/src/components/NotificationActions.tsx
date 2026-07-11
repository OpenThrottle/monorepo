import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';

export interface NotificationActionsProps {
  readonly dismissAll: () => void;
  readonly hasAny: boolean;
  readonly markAllAsRead: () => void;
  readonly setOpen: (open: boolean) => void;
}

/** @public */
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
    <div className="flex w-full gap-1" data-testid="NotificationActions">
      <Button
        className={clsx('h-7 flex-1 text-xs', { 'opacity-25!': !hasAny })}
        disabled={!hasAny}
        onClick={markAllAsRead}
        size="sm"
        variant="ghost"
      >
        Mark all read
      </Button>
      <Button
        className={clsx('h-7 flex-1 text-xs', { 'opacity-25!': !hasAny })}
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
