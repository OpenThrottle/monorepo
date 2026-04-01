import * as React from 'react';
import classnames from 'classnames';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

/** One row of chart data: date plus the six series. */
export interface DailyStatsChartDatum {
  readonly date: string;
  readonly plansCompleted: number;
  readonly plansCreated: number;
  readonly plansUpdated: number;
  readonly tasksCompleted: number;
  readonly tasksCreated: number;
  readonly tasksUpdated: number;
}

const CHART_CONFIG: ChartConfig = {
  plansCompleted: { color: 'var(--chart-2)', label: 'Plans completed' },
  plansCreated: { color: 'var(--chart-1)', label: 'Plans created' },
  plansUpdated: { color: 'var(--chart-3)', label: 'Plans updated' },
  tasksCompleted: { color: 'var(--chart-5)', label: 'Tasks completed' },
  tasksCreated: { color: 'var(--chart-4)', label: 'Tasks created' },
  tasksUpdated: { color: 'var(--chart-5)', label: 'Tasks updated' },
};

/**
 * @description Formats YYYY-MM-DD for X-axis display (e.g. "Feb 11").
 */
function formatChartDate(value: string): string {
  const d = new Date(value + 'T00:00:00');
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * @description Maps DashboardDailyStatsCardFragment[] to chart data and config for Recharts.
 */
function mapToChartData(
  items: ReadonlyArray<DashboardDailyStatsCardFragment>,
): DailyStatsChartDatum[] {
  return items.map((item) => ({
    date: item.date,
    plansCompleted: item.plansCompleted,
    plansCreated: item.plansCreated,
    plansUpdated: item.plansUpdated,
    tasksCompleted: item.tasksCompleted,
    tasksCreated: item.tasksCreated,
    tasksUpdated: item.tasksUpdated,
  }));
}

export interface DashboardDailyStatsCardProps {
  readonly className?: string;
  readonly dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment>;
}

export const DashboardDailyStatsCard = (
  props: DashboardDailyStatsCardProps,
) => {
  const { className, dailyStats } = props;

  // Hooks

  // Setup

  // Handlers
  const chartData = React.useMemo(
    () => mapToChartData(dailyStats),
    [dailyStats],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (chartData.length === 0) {
    return (
      <div
        className={classnames('text-sm text-muted-foreground', className)}
        data-testid="DashboardDailyStatsCard"
      >
        No daily stats in range.
      </div>
    );
  }

  return (
    <div
      className={classnames('-ml-1 text-sm overflow-auto', className)}
      data-testid="DashboardDailyStatsCard"
    >
      <ChartContainer
        className="min-h-[240px] mt-4 w-full"
        config={CHART_CONFIG}
      >
        <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
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
