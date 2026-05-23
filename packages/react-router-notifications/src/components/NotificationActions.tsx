import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';

export interface NotificationActionsProps {
  readonly dismissAll: () => void;
  readonly markAllAsRead: () => void;
  readonly setOpen: (open: boolean) => void;
}

export const NotificationActions = (
  props: NotificationActionsProps,
): React.ReactElement => {
  const { dismissAll, markAllAsRead, setOpen } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex gap-1" data-testid="NotificationActions">
      <Button
        className="h-7 text-xs"
        onClick={markAllAsRead}
        size="sm"
        variant="ghost"
      >
        Mark all read
      </Button>
      <Button
        className="h-7 text-xs"
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
