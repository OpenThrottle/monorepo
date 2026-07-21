import * as React from 'react';
import clsx from 'clsx';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { QueueStateChartAxisTick } from '~/routing/queues/components/QueueStateChartAxisTick';
import {
  formatQueueStateChartTick,
  isQueueStateChartView,
  QUEUE_STATE_CHART_CATEGORY_AXIS_WIDTH,
  QUEUE_STATE_CHART_CONFIG,
  QUEUE_STATE_CHART_SERIES,
  queueStateChartData,
  queueStateChartHeight,
} from '~/routing/queues/utils/queue-state-chart';
import type { QueueStateChartView } from '~/routing/queues/utils/queue-state-chart';

export interface QueueStateChartProps {
  className?: string;
  queues: QueueCardFragment[];
}

export const QueueStateChart = (
  props: QueueStateChartProps,
): React.ReactElement => {
  const { className, queues } = props;

  // Hooks
  const [view, setView] = React.useState<QueueStateChartView>('aggregate');

  // Setup
  const chartData = React.useMemo(
    () => queueStateChartData(view, queues),
    [queues, view],
  );

  const chartHeight = React.useMemo(
    () => queueStateChartHeight(chartData.length),
    [chartData.length],
  );

  const isEmpty = queues.length === 0;

  // Handlers
  const handleViewChange = (value: string): void => {
    // Radix single-select emits '' when the active item is re-clicked;
    // keep the current view so a mode is always active.
    if (isQueueStateChartView(value)) {
      setView(value);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEmpty) {
    return (
      <section
        aria-labelledby="queue-state-chart-heading"
        className={clsx(className)}
        data-testid="QueueStateChart"
      >
        <h2 className="text-md" id="queue-state-chart-heading">
          Job counts by state
        </h2>
        <p className="text-muted-foreground text-sm">
          No queues to chart. When workers register Bull queues with the API,
          job counts appear here.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="queue-state-chart-heading"
      className={clsx(className)}
      data-testid="QueueStateChart"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-md" id="queue-state-chart-heading">
          Job counts by state
        </h2>

        <ToggleGroup
          aria-label="Queue state chart view"
          data-testid="queue-state-chart-view"
          onValueChange={handleViewChange}
          type="single"
          value={view}
          variant="outline"
        >
          <ToggleGroupItem value="aggregate">Single</ToggleGroupItem>
          <ToggleGroupItem value="byQueue">By queue</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <p className="text-muted-foreground text-sm">
        {view === 'aggregate'
          ? 'All queues combined into one bar, stacked by job state. Hover a segment for exact counts.'
          : 'One bar per queue, each stacked by job state. Hover a segment for exact counts.'}
      </p>

      <div
        className="mt-4 w-full"
        data-testid="queue-state-chart-canvas"
        style={{ minHeight: `${chartHeight}px` }}
      >
        <ChartContainer
          className="mt-8 min-h-[300px] w-full"
          config={QUEUE_STATE_CHART_CONFIG}
          style={{ minHeight: `${chartHeight}px` }}
        >
          <BarChart
            accessibilityLayer={true}
            data={chartData}
            height={chartHeight}
            layout="vertical"
            margin={{ bottom: 4, left: 4, right: 12, top: 4 }}
            style={{ minHeight: 240 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              vertical={true}
            />
            <XAxis
              allowDecimals={false}
              axisLine={false}
              tickFormatter={formatQueueStateChartTick}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="name"
              interval={0}
              tick={<QueueStateChartAxisTick />}
              tickLine={false}
              tickMargin={8}
              type="category"
              width={QUEUE_STATE_CHART_CATEGORY_AXIS_WIDTH}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {QUEUE_STATE_CHART_SERIES.map((seriesKey) => (
              <Bar
                dataKey={seriesKey}
                fill={`var(--color-${seriesKey})`}
                key={seriesKey}
                stackId="state"
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
};

QueueStateChart.displayName = 'QueueStateChart';
