import * as React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import {
  CHART_CONFIG,
  type DailyStatsChartDatum,
} from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DAILY_STATS_METRICS } from '~/routing/dashboard/data/data.copy';

export interface DashboardDailyStatsDayChartProps {
  datum: DailyStatsChartDatum;
}

/**
 * @description Focused single-day view: one horizontal bar per metric, reusing the
 * activity card's CHART_CONFIG colors/labels for visual consistency.
 */
export const DashboardDailyStatsDayChart = (
  props: DashboardDailyStatsDayChartProps,
): React.ReactElement => {
  const { datum } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(
    () =>
      DAILY_STATS_METRICS.map((metric) => ({
        fill: `var(--color-${metric.key})`,
        label: metric.label,
        value: datum[metric.key],
      })),
    [datum],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="w-full" data-testid="DashboardDailyStatsDayChart">
      <ChartContainer className="min-h-[220px] w-full" config={CHART_CONFIG}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ bottom: 4, left: 8, right: 12, top: 4 }}
        >
          <XAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            type="category"
            width={120}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((row) => (
              <Cell fill={row.fill} key={row.label} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};
