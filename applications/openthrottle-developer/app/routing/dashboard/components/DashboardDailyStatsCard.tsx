import * as React from 'react';
import clsx from 'clsx';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { DAILY_STATS_CHART_CONFIG } from '~/routing/dashboard/data/daily-stats-chart';
import { resolveDateFromActiveIndex } from '~/routing/dashboard/utils/daily-stats-selection';
import {
  formatChartDate,
  mapToChartData,
} from '~/routing/dashboard/utils/daily-stats-chart';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

export interface DashboardDailyStatsCardProps {
  className?: string;
  dailyStats: DashboardDailyStatsCardFragment[];
  /** Called with the clicked day's date (YYYY-MM-DD) when a bar is selected. */
  onSelectDate?: (date: string) => void;
}

export const DashboardDailyStatsCard = (
  props: DashboardDailyStatsCardProps,
): React.ReactElement => {
  const { className, dailyStats, onSelectDate } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () => mapToChartData(dailyStats),
    [dailyStats],
  );

  // Handlers
  const handleBarClick = React.useCallback(
    (state: { activeIndex?: number | string | null }): void => {
      const date = resolveDateFromActiveIndex(chartData, state.activeIndex);

      if (date !== null) {
        onSelectDate?.(date);
      }
    },
    [chartData, onSelectDate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (chartData.length === 0) {
    return (
      <div
        className={clsx('text-muted-foreground text-sm', className)}
        data-testid="DashboardDailyStatsCard"
      >
        No daily stats in range.
      </div>
    );
  }

  return (
    <div
      className={clsx('-ml-1 overflow-auto text-sm', className)}
      data-testid="DashboardDailyStatsCard"
    >
      <ChartContainer
        className={clsx('mt-4 min-h-[240px] w-full', {
          'cursor-pointer': onSelectDate !== undefined,
        })}
        config={DAILY_STATS_CHART_CONFIG}
      >
        <BarChart
          data={chartData}
          margin={{ left: 0, right: 12 }}
          onClick={handleBarClick}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            tickFormatter={formatChartDate}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={4} width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {/* <ChartLegend content={<ChartLegendContent />} /> */}
          <Bar
            dataKey="plansCreated"
            fill="var(--color-plansCreated)"
            radius={[0, 0, 0, 0]}
            stackId="plans"
          />
          <Bar
            dataKey="plansCompleted"
            fill="var(--color-plansCompleted)"
            radius={[0, 0, 0, 0]}
            stackId="plans"
          />
          <Bar
            dataKey="plansUpdated"
            fill="var(--color-plansUpdated)"
            radius={[4, 4, 0, 0]}
            stackId="plans"
          />
          <Bar
            dataKey="tasksCreated"
            fill="var(--color-tasksCreated)"
            radius={[0, 0, 0, 0]}
            stackId="tasks"
          />
          <Bar
            dataKey="tasksCompleted"
            fill="var(--color-tasksCompleted)"
            radius={[0, 0, 0, 0]}
            stackId="tasks"
          />
          <Bar
            dataKey="tasksUpdated"
            fill="var(--color-tasksUpdated)"
            radius={[4, 4, 0, 0]}
            stackId="tasks"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};
