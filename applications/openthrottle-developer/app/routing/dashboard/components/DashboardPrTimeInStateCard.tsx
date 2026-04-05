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
export interface PrTimeInStateDatum {
  readonly avgDaysInState?: number | null | undefined;
  readonly count: number;
  readonly state: string;
}

const CHART_CONFIG: ChartConfig = {
  avgDaysInState: {
    color: 'var(--chart-2)',
    label: 'Avg days in state',
  },
  count: { color: 'var(--chart-1)', label: 'Count' },
};

export interface DashboardPrTimeInStateCardProps {
  readonly className?: string;
  readonly prTimeInStateSummary: ReadonlyArray<PrTimeInStateDatum>;
}

/**
 * @description Renders PR Time in State as a bar chart (state on X, count and avg days).
 */
export const DashboardPrTimeInStateCard = (
  props: DashboardPrTimeInStateCardProps,
) => {
  const { className, prTimeInStateSummary } = props;

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

  if (isEmpty) {
    return (
      <div
        className={classnames('text-sm text-muted-foreground', className)}
        data-testid="DashboardPrTimeInStateCard"
      >
        No PR time in state summary.
      </div>
    );
  }

  return (
    <div
      className={classnames('-ml-1 text-sm overflow-auto', className)}
      data-testid="DashboardPrTimeInStateCard"
    >
      <ChartContainer
        className="min-h-[240px] mt-4 w-full"
        config={CHART_CONFIG}
      >
        <BarChart
          data={chartData}
          margin={{ bottom: 8, left: 0, right: 12, top: 4 }}
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
