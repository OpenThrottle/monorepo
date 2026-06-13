import * as React from 'react';
import classnames from 'classnames';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

/** One row for the chart: state + count + avgDaysInState. */
interface PrTimeInStateDatum {
  avgDaysInState?: number | null | undefined;
  count: number;
  state: string;
}

const CHART_CONFIG: ChartConfig = {
  avgDaysInState: {
    color: 'var(--chart-2)',
    label: 'Avg days in state',
  },
  count: { color: 'var(--chart-1)', label: 'Count' },
};

export interface DashboardPrTimeInStateCardProps {
  className?: string;
  prTimeInStateSummary: PrTimeInStateDatum[];
}

/**
 * @description Renders PR Time in State as a bar chart (state on X, count and avg days).
 */
export const DashboardPrTimeInStateCard = (
  props: DashboardPrTimeInStateCardProps,
): React.ReactElement => {
  const { className, prTimeInStateSummary } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () =>
      [...prTimeInStateSummary].map((node) => ({
        avgDaysInState: node.avgDaysInState ?? 0,
        count: node.count,
        state: node.state,
      })),

    [prTimeInStateSummary],
  );

  const isEmpty = chartData.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEmpty) {
    return (
      <div
        className={classnames('text-muted-foreground text-sm', className)}
        data-testid="DashboardPrTimeInStateCard"
      >
        No PR time in state summary.
      </div>
    );
  }

  return (
    <div
      className={classnames('-ml-1 overflow-auto text-sm', className)}
      data-testid="DashboardPrTimeInStateCard"
    >
      <ChartContainer
        className="mt-4 min-h-[240px] w-full"
        config={CHART_CONFIG}
      >
        <BarChart
          data={chartData}
          margin={{ bottom: 8, left: 0, right: 12, top: 4 }}
          style={{ minHeight: 240 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="state"
            tickLine={false}
            tickMargin={8}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={4} width={36} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => Number(value).toFixed(2)}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="avgDaysInState"
            fill="var(--color-avgDaysInState)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};
