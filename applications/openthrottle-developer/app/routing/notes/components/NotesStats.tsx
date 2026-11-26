import { cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { NOTES_STATS_COPY } from '~/routing/notes/data/copy';

export interface NotesStatsProps {
  readonly authorCount: number;
  className?: string;
  readonly createdLast30Days: number;
  readonly total: number;
  readonly updatedLast7Days: number;
}

/**
 * @description Counts for the notes list, computed by the route loader from the
 * notes the current search returns, before pagination.
 */
export const NotesStats = (props: NotesStatsProps): React.ReactElement => {
  const { authorCount, className, createdLast30Days, total, updatedLast7Days } =
    props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-12',
        className,
      )}
      data-testid="NotesStats"
    >
      <OpenThrottleStatCard
        color="bg-blue-300"
        title={NOTES_STATS_COPY.updatedLast7Days}
        value={updatedLast7Days}
      />
      <OpenThrottleStatCard
        color="bg-green-300"
        title={NOTES_STATS_COPY.createdLast30Days}
        value={createdLast30Days}
      />
      <OpenThrottleStatCard
        color="bg-yellow-300"
        title={NOTES_STATS_COPY.authors}
        value={authorCount}
      />
      <OpenThrottleStatCard title={NOTES_STATS_COPY.total} value={total} />
    </div>
  );
};
