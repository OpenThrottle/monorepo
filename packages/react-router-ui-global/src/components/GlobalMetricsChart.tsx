import * as React from 'react';
import clsx from 'clsx';
import {
  Card,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@openthrottle/react-router-shadcn';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { GLOBAL_METRICS_CHART_CONFIG } from '../config';
import type { MetricsChartDatum } from '../utils/storage';

export interface GlobalMetricsChartProps {
  readonly data: MetricsChartDatum[];
}

/**
 * @description The time-series line chart of the `GlobalMetrics` panel (RSS /
 * heap / CPU per sample). The caller gates rendering on data being present.
 * Root keeps the `GlobalMetrics-chart-card` test id from before extraction.
 */
export const GlobalMetricsChart = (
  props: GlobalMetricsChartProps,
): React.ReactElement => {
  const { data } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={clsx('p-4 md:p-8')} data-testid="GlobalMetrics-chart-card">
      <ChartContainer
        className="-ml-1 min-h-[160px] w-full overflow-visible text-sm"
        config={GLOBAL_METRICS_CHART_CONFIG}
      >
        <LineChart
          data={data}
          margin={{ bottom: 8, left: 10, right: 12, top: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="i" tickLine={false} tickMargin={8} />
          <YAxis axisLine={false} tickLine={false} tickMargin={4} width={36} />
          <ChartTooltip content={<ChartTooltipContent labelKey="i" />} />
          <Line
            dataKey="rssMb"
            dot={false}
            stroke="var(--color-rssMb)"
            strokeWidth={1.5}
            type="monotone"
          />
          <Line
            dataKey="heapUsedMb"
            dot={false}
            stroke="var(--color-heapUsedMb)"
            strokeWidth={1.5}
            type="monotone"
          />
          <Line
            dataKey="cpuUserMs"
            dot={false}
            stroke="var(--color-cpuUserMs)"
            strokeWidth={1.5}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>
    </Card>
  );
};
