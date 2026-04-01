'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './Chart';

const DEFAULT_COLOR = 'var(--chart-1)';

export interface SimpleBarChartProps<
  T extends Record<string, string | number> = Record<string, string | number>,
> {
  /** Data rows; each must include the keys given by categoryKey and valueKey. */
  readonly data: ReadonlyArray<T>;
  /** Key in each datum for the category (shown on X or Y axis). */
  readonly categoryKey: keyof T & string;
  /** Key in each datum for the bar value. */
  readonly valueKey: keyof T & string;
  /** Optional label for the value series (tooltip/legend). */
  readonly valueLabel?: string;
  /** Bar fill color. Defaults to var(--chart-1). */
  readonly color?: string;
  /** Vertical bars (category on X) or horizontal bars (category on Y). */
  readonly layout?: 'horizontal' | 'vertical';
  readonly className?: string;
  readonly margin?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
}

/**
 * @description Single-series bar chart preset: category on axis, one value series. Reduces boilerplate for ChartContainer + BarChart + axis/tooltip setup.
 */
export function SimpleBarChart<T extends Record<string, string | number>>(
  props: SimpleBarChartProps<T>,
): React.ReactElement {
  const {
    data,
    categoryKey,
    valueKey,
    valueLabel,
    color = DEFAULT_COLOR,
    layout = 'horizontal',
    className,
    margin = { bottom: 8, left: 0, right: 12, top: 4 },
  } = props;

  const config: ChartConfig = React.useMemo(
    () => ({
      [valueKey]: {
        color,
        label: valueLabel ?? String(valueKey),
      },
    }),
    [valueKey, color, valueLabel],
  );

  const isVertical = layout === 'vertical';

  return (
    <ChartContainer className={className} config={config}>
      <BarChart
        data={data as ReadonlyArray<Record<string, string | number>>}
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
              dataKey={categoryKey as any} // FIXME: update this
              tickLine={false}
              type="category"
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis
              axisLine={false}
              dataKey={categoryKey as any} // FIXME: update this
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
          // dataKey={valueKey}
          fill={`var(--color-${valueKey})`}
          radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
