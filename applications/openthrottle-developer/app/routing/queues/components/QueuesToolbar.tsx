import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { QueueCardFragment } from '~/__generated__/graphql';

export interface QueuesToolbarProps {
  readonly className?: string;
  /** Passed for future search/filter over queue list. */
  readonly queues?: QueueCardFragment[];
}

/**
 * @description Compact single-row toolbar with Create queue link. Optional search/filter can be added later.
 */
export const QueuesToolbar = (props: QueuesToolbarProps) => {
  const { className, queues: _queues } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'flex flex-wrap items-center gap-2 w-full',
        className,
      )}
      data-testid="QueuesToolbar"
    >
      <div className="flex-1 min-w-0" />
      <Button asChild={true} className="shrink-0" variant="default">
        <Link to="/queues/create">Create queue</Link>
      </Button>
    </div>
  );
};
