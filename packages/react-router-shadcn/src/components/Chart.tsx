'use client';

import * as React from 'react';
import { Legend as RechartsLegend } from 'recharts';
import type { ChartConfig, ChartConfigEntry } from './chart-config';
import { getChartColor, readUnknownRecordValue } from './chart-config';
import { useChartConfig } from './chart-config-context';

export type { ChartConfig, ChartConfigEntry };
export type { ChartContainerProps } from './ChartContainer';
export { ChartContainer } from './ChartContainer';
export type { ChartTooltipContentProps } from './ChartTooltipContent';
export { ChartTooltipContent } from './ChartTooltipContent';
export type { ChartTooltipProps } from './ChartTooltip';
export { ChartTooltip } from './ChartTooltip';

export interface ChartLegendContentProps {
  readonly payload?: ReadonlyArray<{
    value?: string;
    dataKey?: string;
    color?: string;
  }>;
  readonly nameKey?: string;
}

/**
 * Content component for chart legend. Use with Recharts Legend: content={<ChartLegendContent />}.
 */
export function ChartLegendContent({
  payload = [],
  nameKey,
}: ChartLegendContentProps): React.ReactElement | null {
  const config = useChartConfig();
  if (payload.length === 0) return null;

  const nameForKey = (key: string): string => {
    const entry = config?.[key];

    if (entry?.label) return entry.label;
    const p = payload.find(
      (item) => String(item.dataKey ?? item.value) === key,
    );

    if (p?.value) return p.value;
    if (nameKey && p) {
      const raw = readUnknownRecordValue(p, nameKey);
      if (raw != null) return String(raw);
    }

    return key;
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {payload.map((entry, index) => {
        const key = String(entry.dataKey ?? entry.value ?? index);
        const name = nameForKey(key);
        const color = entry.color ?? getChartColor(config?.[key]);
        return (
          <div className="flex items-center gap-1.5" key={key}>
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface ChartLegendProps {
  readonly content?: React.ReactElement;
  readonly children?: never;
}

/**
 * Recharts Legend wired to ChartLegendContent. Use inside a chart: <ChartLegend content={<ChartLegendContent />} />.
 */
export function ChartLegend({
  content,
  ...props
}: ChartLegendProps &
  React.ComponentProps<typeof RechartsLegend>): React.ReactElement {
  return <RechartsLegend {...props} content={content} />;
}
