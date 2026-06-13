import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

export interface Column {
  key: keyof Pick<
    DashboardQueueStatsCardFragment,
    | 'waitingCount'
    | 'activeCount'
    | 'completedCount'
    | 'failedCount'
    | 'delayedCount'
  >;
  label: string;
}

export const COLUMNS: Column[] = [
  { key: 'waitingCount', label: 'Waiting' },
  { key: 'activeCount', label: 'Active' },
  { key: 'completedCount', label: 'Completed' },
  { key: 'failedCount', label: 'Failed' },
  { key: 'delayedCount', label: 'Delayed' },
];

/**
 * Formats queue stats for tooltip (full labels and counts).
 */
export function formatQueueStatsTooltip(
  queue: DashboardQueueStatsCardFragment,
): string {
  return COLUMNS.map((col) => `${col.label}: ${queue[col.key]}`).join(', ');
}

/**
 * Compact inline summary for a single queue (W:2 A:1 C:10 F:0 D:0).
 */
export function formatCompactSummary(
  queue: DashboardQueueStatsCardFragment,
): string {
  return `W:${queue.waitingCount} A:${queue.activeCount} C:${queue.completedCount} F:${queue.failedCount} D:${queue.delayedCount}`;
}

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
