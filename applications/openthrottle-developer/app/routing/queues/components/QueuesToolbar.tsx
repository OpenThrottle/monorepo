import * as React from 'react';
import clsx from 'clsx';

/**
 * @deprecated Stub toolbar; commented out in `QueuesIntroduction` until queues list UX is wired.
 */
export interface QueuesToolbarProps {
  className?: string;
}

export const QueuesToolbar = (
  props: QueuesToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('p-4', className)} data-testid="QueuesToolbar">
      <h2>QueuesToolbar</h2>
    </div>
  );
};
