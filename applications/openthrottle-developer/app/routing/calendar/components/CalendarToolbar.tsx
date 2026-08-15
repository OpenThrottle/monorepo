import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { PlusIcon } from 'lucide-react';

export interface CalendarToolbarProps {
  className?: string;
}

/**
 * @description Compact toolbar: URL-driven search (search) and Create event link.
 * Preserves data-testid and URL-driven state via GlobalToolbarSearch.
 */
export const CalendarToolbar = (
  props: CalendarToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="CalendarToolbar">
      <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
        <GlobalToolbarSearch
          aria-label="Search events"
          placeholder="Search events"
          transformCommittedParams={(next) => next.delete('q')}
        />
        <div className="min-w-0 flex-1" />
        <Button asChild={true} className="shrink-0" variant="outline">
          <Link to="/calendar/create" viewTransition={true}>
            <PlusIcon className="h-4 w-4" /> Create event
          </Link>
        </Button>
      </div>
    </div>
  );
};
