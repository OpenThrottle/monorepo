import * as React from 'react';
import type { ChartTooltipContentProps } from '@openthrottle/react-router-shadcn';
import {
  QUEUE_STATS_CHART_CONFIG,
  QUEUE_STATS_CHART_SERIES,
} from '~/routing/queues/utils/queue-stats-chart';

export type QueueStatsChartTooltipProps = ChartTooltipContentProps;

type QueueStatsChartRow = Record<
  (typeof QUEUE_STATS_CHART_SERIES)[number],
  number
> & {
  name: string;
};

const isQueueStatsChartRow = (value: unknown): value is QueueStatsChartRow => {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.name === 'string' &&
    QUEUE_STATS_CHART_SERIES.every((key) => typeof row[key] === 'number')
  );
};

/**
 * @description Tooltip for QueuesStats: always lists all five table counts even when completed is hidden from bars.
 */
export const QueueStatsChartTooltip = (
  props: QueueStatsChartTooltipProps,
): React.ReactElement | null => {
  const { active, label, payload = [] } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!active || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload;
  if (!isQueueStatsChartRow(row)) {
    return null;
  }

  const labelValue = label ?? row.name;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium leading-none">{String(labelValue)}</p>
      <div className="flex flex-col gap-1.5">
        {QUEUE_STATS_CHART_SERIES.map((seriesKey) => {
          const seriesConfig = QUEUE_STATS_CHART_CONFIG[seriesKey];
          const name = seriesConfig.label ?? seriesKey;

          return (
            <div className="flex items-center gap-2" key={seriesKey}>
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: `var(--color-${seriesKey})` }}
              />
              <span className="flex-1 text-muted-foreground">{name}</span>
              <span className="font-medium tabular-nums">{row[seriesKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

QueueStatsChartTooltip.displayName = 'QueueStatsChartTooltip';
