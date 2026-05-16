'use client';

import * as React from 'react';
import type { CurveType, DataKey } from 'recharts';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './Chart/ChartContainer';
import { ChartTooltip } from './Chart/ChartTooltip';
import { ChartTooltipContent } from './Chart/ChartTooltipContent';
import type { ChartConfig } from './chart-config';

const DEFAULT_COLOR = 'var(--chart-1)';

export interface SimpleAreaChartProps<
  T extends Record<string, string | number> = Record<string, string | number>,
> {
  /** Key in each datum for the category (shown on X axis). */
  readonly categoryKey: keyof T & string;
  readonly className?: string;
  /** Area fill color. Defaults to var(--chart-1). */
  readonly color?: string;
  /** Interpolation curve for the area series. */
  readonly curveType?: CurveType;
  /** Data rows; each must include the keys given by categoryKey and valueKey. */
  readonly data: ReadonlyArray<T>;
  /** Opacity of the filled area (0–1). */
  readonly fillOpacity?: number;
  readonly margin?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
  /** Key in each datum for the area value. */
  readonly valueKey: keyof T & string;
  /** Optional label for the value series (tooltip/legend). */
  readonly valueLabel?: string;
}

/**
 * @description Single-series area chart preset: category on X axis, one value series. Reduces boilerplate for ChartContainer + AreaChart + axis/tooltip setup.
 */
export function SimpleAreaChart<T extends Record<string, string | number>>(
  props: SimpleAreaChartProps<T>,
): React.ReactElement {
  const {
    categoryKey,
    className,
    color = DEFAULT_COLOR,
    curveType = 'monotone',
    data,
    fillOpacity = 0.4,
    margin = { bottom: 8, left: 0, right: 12, top: 4 },
    valueKey,
    valueLabel,
  } = props;

  // Hooks

  // Setup
  const categoryAxisKey = categoryKey as DataKey<T>;

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
      <AreaChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey={categoryAxisKey}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis axisLine={false} tickLine={false} tickMargin={4} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey={valueKey as DataKey<T>}
          fill={`var(--color-${valueKey})`}
          fillOpacity={fillOpacity}
          stroke={`var(--color-${valueKey})`}
          strokeWidth={2}
          type={curveType}
        />
      </AreaChart>
    </ChartContainer>
  );
}
