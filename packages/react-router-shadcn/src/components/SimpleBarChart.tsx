'use client';

import * as React from 'react';
import type { DataKey } from 'recharts';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './Chart/ChartContainer';
import { ChartTooltip } from './Chart/ChartTooltip';
import { ChartTooltipContent } from './Chart/ChartTooltipContent';
import type { ChartConfig } from './chart-config';

const DEFAULT_COLOR = 'var(--chart-1)';

export interface SimpleBarChartProps<
  T extends Record<string, string | number> = Record<string, string | number>,
> {
  /** Key in each datum for the category (shown on X or Y axis). */
  readonly categoryKey: keyof T & string;
  readonly className?: string;
  /** Bar fill color. Defaults to var(--chart-1). */
  readonly color?: string;
  /** Data rows; each must include the keys given by categoryKey and valueKey. */
  readonly data: ReadonlyArray<T>;
  /** Vertical bars (category on X) or horizontal bars (category on Y). */
  readonly layout?: 'horizontal' | 'vertical';
  readonly margin?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
  /** Key in each datum for the bar value. */
  readonly valueKey: keyof T & string;
  /** Optional label for the value series (tooltip/legend). */
  readonly valueLabel?: string;
}

/**
 * @description Single-series bar chart preset: category on axis, one value series. Reduces boilerplate for ChartContainer + BarChart + axis/tooltip setup.
 */
export function SimpleBarChart<T extends Record<string, string | number>>(
  props: SimpleBarChartProps<T>,
): React.ReactElement {
  const {
    categoryKey,
    className,
    color = DEFAULT_COLOR,
    data,
    layout = 'horizontal',
    margin = { bottom: 8, left: 0, right: 12, top: 4 },
    valueKey,
    valueLabel,
  } = props;

  // Hooks

  // Setup
  const isVertical = layout === 'vertical';

  // Recharts `TypedDataKey<T>` does not accept `keyof T & string`; values are valid axis keys at runtime.
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
      <BarChart
        data={data}
        layout={isVertical ? 'vertical' : undefined}
        margin={margin}
      >
        <CartesianGrid
          horizontal={!isVertical}
          strokeDasharray="3 3"
          vertical={isVertical}
        />
        {isVertical ? (
          <>
            <XAxis axisLine={false} tickLine={false} type="number" />
            <YAxis
              axisLine={false}
              dataKey={categoryAxisKey}
              tickLine={false}
              type="category"
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis
              axisLine={false}
              dataKey={categoryAxisKey}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={36}
            />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey={valueKey as DataKey<T>}
          fill={`var(--color-${valueKey})`}
          radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
