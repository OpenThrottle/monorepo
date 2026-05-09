import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

const COLUMNS: ReadonlyArray<{
  readonly key: keyof Pick<
    DashboardQueueStatsCardFragment,
    | 'waitingCount'
    | 'activeCount'
    | 'completedCount'
    | 'failedCount'
    | 'delayedCount'
  >;
  readonly label: string;
}> = [
  { key: 'waitingCount', label: 'Waiting' },
  { key: 'activeCount', label: 'Active' },
  { key: 'completedCount', label: 'Completed' },
  { key: 'failedCount', label: 'Failed' },
  { key: 'delayedCount', label: 'Delayed' },
];

/**
 * @description Formats queue stats for tooltip (full labels and counts).
 */
function formatQueueStatsTooltip(
  queue: DashboardQueueStatsCardFragment,
): string {
  return COLUMNS.map((col) => `${col.label}: ${queue[col.key]}`).join(', ');
}

/**
 * @description Compact inline summary for a single queue (W:2 A:1 C:10 F:0 D:0).
 */
function formatCompactSummary(queue: DashboardQueueStatsCardFragment): string {
  return `W:${queue.waitingCount} A:${queue.activeCount} C:${queue.completedCount} F:${queue.failedCount} D:${queue.delayedCount}`;
}

export interface DashboardQueueStatsProps {
  // readonly className?: string;
  readonly data: ReadonlyArray<DashboardQueueStatsCardFragment>;
}

export const DashboardQueueStats = (props: DashboardQueueStatsProps) => {
  const { data } = props;

  // Hooks

  // Setup
  const isEmpty = data.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="DashboardQueueStats">
      <h2 className="mb-4">Queue Stats</h2>
      {isEmpty ? (
        <p className="mt-2 text-sm text-muted-foreground">No queues</p>
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
                      className="flex cursor-default items-center justify-between gap-2 rounded py-0.5 px-1 hover:bg-muted/50"
                      tabIndex={0}
                    >
                      <span className="truncate font-medium">{queue.name}</span>
                      <span
                        aria-hidden={true}
                        className="shrink-0 tabular-nums text-muted-foreground"
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
