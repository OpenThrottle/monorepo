import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  formatCompactSummary,
  formatQueueStatsTooltip,
} from '~/routing/dashboard/utils/queue-stats';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

/**
 * @deprecated Temporarily commented out on dashboard index; restore when re-enabling queue stats grid.
 */
export interface DashboardQueueStatsProps {
  className?: string;
  data: DashboardQueueStatsCardFragment[];
}

export const DashboardQueueStats = (
  props: DashboardQueueStatsProps,
): React.ReactElement => {
  const { className, data } = props;

  // Hooks

  // Setup
  const isEmpty = data.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="DashboardQueueStats">
      <h2 className="mb-4">Queue Stats</h2>
      {isEmpty ? (
        <p className="text-muted-foreground mt-2 text-sm">No queues</p>
      ) : (
        <div
          aria-label="Queue stats list"
          className="mt-2 space-y-0.5 overflow-auto text-xs"
          role="region"
        >
          <ul className="list-none">
            {data.map((queue) => (
              <li key={queue.name}>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <div
                      className="hover:bg-muted/50 flex cursor-default items-center justify-between gap-2 rounded px-1 py-0.5"
                      tabIndex={0}
                    >
                      <span className="truncate font-medium">{queue.name}</span>
                      <span
                        aria-hidden={true}
                        className="text-muted-foreground shrink-0 tabular-nums"
                      >
                        {formatCompactSummary(queue)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {formatQueueStatsTooltip(queue)}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
