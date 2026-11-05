import * as React from 'react';

import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { DashboardDailyStatsDayChart } from '~/routing/dashboard/components/DashboardDailyStatsDayChart';
import {
  DAILY_STATS_METRICS,
  DAILY_STATS_MODAL_COPY,
} from '~/routing/dashboard/data/data.copy';
import { DAILY_STATS_CHART_CONFIG } from '~/routing/dashboard/data/data.daily-stats-chart';
import { formatChartDate } from '~/routing/dashboard/utils/daily-stats-chart';

export interface DashboardDailyStatsModalDetailProps {
  /** True when the requested date had no row and the most recent day is shown. */
  isFallback: boolean;
  selected: DashboardDailyStatsCardFragment;
}

/**
 * @description The selected day's metric breakdown inside the daily-stats modal.
 */
export const DashboardDailyStatsModalDetail = (
  props: DashboardDailyStatsModalDetailProps,
): React.ReactElement => {
  const { isFallback, selected } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const fallbackHint = (
    <p className="text-muted-foreground text-xs">
      {DAILY_STATS_MODAL_COPY.mostRecentHint}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-4" data-testid="daily-stats-detail">
      <p className="text-muted-foreground text-sm">
        {formatChartDate(selected.date)}
      </p>

      {isFallback ? fallbackHint : null}

      <p className="text-muted-foreground text-xs">
        {DAILY_STATS_MODAL_COPY.completionAttributionCaveat}
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {DAILY_STATS_METRICS.map((metric) => (
          <div className="flex items-center gap-2" key={metric.key}>
            <span
              aria-hidden={true}
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{
                backgroundColor: DAILY_STATS_CHART_CONFIG[metric.key]?.color,
              }}
            />
            <dt className="text-muted-foreground">{metric.label}</dt>
            <dd className="ml-auto font-medium tabular-nums">
              {selected[metric.key]}
            </dd>
          </div>
        ))}
      </dl>

      <DashboardDailyStatsDayChart datum={selected} />
    </div>
  );
};
