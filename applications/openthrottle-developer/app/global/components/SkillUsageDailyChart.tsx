import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  formatSkillUsageChartDate,
  SKILL_USAGE_CHART_CONFIG,
  SKILL_USAGE_CHART_SERIES,
  type SkillUsageChartDatum,
} from '~/global/data/skill-usage-chart';

export interface SkillUsageDailyChartProps {
  className?: string;
  data: readonly SkillUsageChartDatum[];
}

/**
 * @description Stacked daily bar chart: ours / personal / third-party skill
 * invocations.
 * Shared by the /usage route and the /skills/$slug detail route. Under jsdom,
 * Recharts draws no geometry — tests assert the wrapper mounts.
 */
export const SkillUsageDailyChart = (
  props: SkillUsageDailyChartProps,
): React.ReactElement => {
  const { className, data } = props;

  // Hooks

  // Setup
  const chartData = React.useMemo(() => [...data], [data]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (chartData.length === 0) {
    return (
      <div
        className={clsx('text-muted-foreground text-sm', className)}
        data-testid="SkillUsageDailyChart"
      >
        No daily skill usage in range.
      </div>
    );
  }

  return (
    <div
      className={clsx('w-full', className)}
      data-testid="SkillUsageDailyChart"
    >
      <ChartContainer
        className="min-h-[220px] w-full"
        config={SKILL_USAGE_CHART_CONFIG}
      >
        <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            tickFormatter={formatSkillUsageChartDate}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
            width={36}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {SKILL_USAGE_CHART_SERIES.map((series, index) => (
            <Bar
              dataKey={series}
              fill={`var(--color-${series})`}
              key={series}
              radius={
                index === SKILL_USAGE_CHART_SERIES.length - 1
                  ? [4, 4, 0, 0]
                  : [0, 0, 0, 0]
              }
              stackId="skillUsage"
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
};
