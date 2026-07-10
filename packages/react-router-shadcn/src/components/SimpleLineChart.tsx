'use client';

import * as React from 'react';
import type { CurveProps } from 'recharts';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './Chart/ChartContainer';
import { ChartTooltip } from './Chart/ChartTooltip';
import { ChartTooltipContent } from './Chart/ChartTooltipContent';
import type { ChartConfig } from './chart-config';
import { toDataKey } from './chart-data-key';

const DEFAULT_COLOR = 'var(--chart-1)';

export interface SimpleLineChartProps<
  T extends Record<string, string | number> = Record<string, string | number>,
> {
  /** Key in each datum for the category (shown on X axis). */
  readonly categoryKey: keyof T & string;
  readonly className?: string;
  /** Line stroke color. Defaults to var(--chart-1). */
  readonly color?: string;
  /** Interpolation curve for the line series. */
  readonly curveType?: CurveProps['type'];
  // readonly curveType?: CurveType;
  /** Data rows; each must include the keys given by categoryKey and valueKey. */
  readonly data: ReadonlyArray<T>;
  readonly margin?: {
    readonly bottom?: number;
    readonly left?: number;
    readonly right?: number;
    readonly top?: number;
  };
  /** Show dots at each data point. */
  readonly showDots?: boolean;
  /** Key in each datum for the line value. */
  readonly valueKey: keyof T & string;
  /** Optional label for the value series (tooltip/legend). */
  readonly valueLabel?: string;
}

/**
 * @description Single-series line chart preset: category on X axis, one value series. Reduces boilerplate for ChartContainer + LineChart + axis/tooltip setup.
 */
export function SimpleLineChart<T extends Record<string, string | number>>(
  props: SimpleLineChartProps<T>,
): React.ReactElement {
  const {
    categoryKey,
    className,
    color = DEFAULT_COLOR,
    curveType = 'monotone',
    data,
    margin = { bottom: 8, left: 0, right: 12, top: 4 },
    showDots = true,
    valueKey,
    valueLabel,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const config: ChartConfig = React.useMemo(
    () => ({
      [valueKey]: {
        color,
        label: valueLabel ?? String(valueKey),
      },
    }),
    [valueKey, color, valueLabel],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ChartContainer className={className} config={config}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey={toDataKey<T>(categoryKey)}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis axisLine={false} tickLine={false} tickMargin={4} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey={toDataKey<T>(valueKey)}
          dot={showDots}
          stroke={`var(--color-${valueKey})`}
          strokeWidth={2}
          type={curveType}
        />
      </LineChart>
    </ChartContainer>
  );
}
