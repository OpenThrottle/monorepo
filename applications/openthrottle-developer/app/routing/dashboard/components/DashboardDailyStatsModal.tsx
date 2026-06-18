import * as React from 'react';
import { GlobalModal } from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import {
  CHART_CONFIG,
  formatChartDate,
} from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DashboardDailyStatsDayChart } from '~/routing/dashboard/components/DashboardDailyStatsDayChart';
import {
  DAILY_STATS_METRICS,
  DAILY_STATS_MODAL_COPY,
} from '~/routing/dashboard/data/data.copy';
import {
  parseSelectedStatDate,
  selectDailyStatByDate,
  selectMostRecentDailyStat,
} from '~/routing/dashboard/utils/daily-stats-selection';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

export interface DashboardDailyStatsModalProps {
  dailyStats: DashboardDailyStatsCardFragment[];
}

export const DashboardDailyStatsModal = (
  props: DashboardDailyStatsModalProps,
): React.ReactElement => {
  const { dailyStats } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const selectedDate = parseSelectedStatDate(searchParams);
  const explicit = selectDailyStatByDate(dailyStats, selectedDate);
  const selected = explicit ?? selectMostRecentDailyStat(dailyStats);
  const isFallback = explicit === null && selected !== null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal param="modal" value={DashboardDailyStatsModal.key}>
      <h2>{DAILY_STATS_MODAL_COPY.title}</h2>

      {selected === null ? (
        <p className="text-muted-foreground text-sm">
          {DAILY_STATS_MODAL_COPY.emptyDescription}
        </p>
      ) : (
        <div className="flex flex-col gap-4" data-testid="daily-stats-detail">
          <p className="text-muted-foreground text-sm">
            {formatChartDate(selected.date)}
          </p>

          {isFallback ? (
            <p className="text-muted-foreground text-xs">
              {DAILY_STATS_MODAL_COPY.mostRecentHint}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {DAILY_STATS_METRICS.map((metric) => (
              <div className="flex items-center gap-2" key={metric.key}>
                <span
                  aria-hidden={true}
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: CHART_CONFIG[metric.key]?.color }}
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
      )}
    </GlobalModal>
  );
};

DashboardDailyStatsModal.key = 'daily-stats';
