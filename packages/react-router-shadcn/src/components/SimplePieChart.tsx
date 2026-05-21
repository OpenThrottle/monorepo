'use client';

import * as React from 'react';
import type { DataKey } from 'recharts';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer } from './Chart/ChartContainer';
import { ChartTooltip } from './Chart/ChartTooltip';
import { ChartTooltipContent } from './Chart/ChartTooltipContent';
import type { ChartConfig } from './chart-config';

const CHART_COLOR_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

const DEFAULT_INNER_RADIUS_RATIO = 0.6;

export interface SimplePieChartProps<
  T extends Record<string, string | number> = Record<string, string | number>,
> {
  readonly className?: string;
  /** Data rows; each must include the keys given by nameKey and valueKey. */
  readonly data: ReadonlyArray<T>;
  /** Inner radius as a fraction of outer (0–1). Used when variant is donut; default 0.6. */
  readonly innerRadiusRatio?: number;
  /** Key in each datum for the slice label (tooltip and config). */
  readonly nameKey: keyof T & string;
  /** Part-to-whole layout: full pie or donut (ring). */
  readonly variant?: 'donut' | 'pie';
  /** Key in each datum for the slice value. */
  readonly valueKey: keyof T & string;
  /** Optional label for the value series (tooltip). */
  readonly valueLabel?: string;
}

/**
 * @description Part-to-whole pie (or donut) preset: one value per named slice. Reduces boilerplate for ChartContainer + PieChart + tooltip setup.
 */
export function SimplePieChart<T extends Record<string, string | number>>(
  props: SimplePieChartProps<T>,
): React.ReactElement {
  const {
    className,
    data,
    innerRadiusRatio = DEFAULT_INNER_RADIUS_RATIO,
    nameKey,
    variant = 'pie',
    valueKey,
    valueLabel,
  } = props;

  // Hooks

  // Setup
  const valueDataKey = valueKey as DataKey<T>;
  const isDonut = variant === 'donut';

  // Handlers
  const config: ChartConfig = React.useMemo(() => {
    const entries: ChartConfig = {};

    for (let index = 0; index < data.length; index += 1) {
      const row = data[index];
      if (row == null) continue;

      const sliceName = String(row[nameKey]);
      entries[sliceName] = {
        color: CHART_COLOR_VARS[index % CHART_COLOR_VARS.length],
        label: sliceName,
      };
    }

    if (valueLabel != null) {
      entries[valueKey] = {
        label: valueLabel,
      };
    }

    return entries;
  }, [data, nameKey, valueKey, valueLabel]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ChartContainer className={className} config={config}>
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel={true} nameKey={nameKey} />}
        />
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey={valueDataKey}
          innerRadius={isDonut ? `${innerRadiusRatio * 100}%` : 0}
          nameKey={nameKey}
          outerRadius="80%"
          strokeWidth={1}
        >
          {data.map((row, index) => {
            const sliceName = String(row[nameKey]);

            return (
              <Cell
                fill={`var(--color-${sliceName})`}
                key={`${sliceName}-${index}`}
              />
            );
          })}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
