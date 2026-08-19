import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleToolbarProps {
  className?: string;
}

/**
 * @description Compact toolbar for the schedule index: URL-driven search (search)
 * and a create-schedule link. Mirrors NotesToolbar/CalendarToolbar so every list
 * route reads the same, and keeps its state in the URL rather than local state.
 */
export const ScheduleToolbar = (
  props: ScheduleToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="ScheduleToolbar">
      <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
        <GlobalToolbarSearch
          aria-label={SCHEDULE_COPY.searchLabel}
          placeholder={SCHEDULE_COPY.searchPlaceholder}
        />
        <div className="min-w-0 flex-1" />
        <Button asChild={true} className="shrink-0" variant="outline">
          <Link to="/schedule/create" viewTransition={true}>
            <PlusIcon className="h-4 w-4" /> {SCHEDULE_COPY.newScheduleAction}
          </Link>
        </Button>
      </div>
    </div>
  );
};
