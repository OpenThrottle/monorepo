import * as React from 'react';
import clsx from 'clsx';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  formatSkillUsageChartDate,
  SKILL_USAGE_CHART_CONFIG,
  type SkillUsageChartDatum,
} from '~/global/data/skill-usage-chart';

export interface SkillUsageDailyChartProps {
  className?: string;
  data: readonly SkillUsageChartDatum[];
}

/**
 * @description Stacked daily bar chart: ours vs third-party skill invocations.
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
          <Bar
            dataKey="oursCount"
            fill="var(--color-oursCount)"
            radius={[0, 0, 0, 0]}
            stackId="skillUsage"
          />
          <Bar
            dataKey="thirdPartyCount"
            fill="var(--color-thirdPartyCount)"
            radius={[4, 4, 0, 0]}
            stackId="skillUsage"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};
