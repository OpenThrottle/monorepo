'use client';

import * as React from 'react';
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '../utils/cn';
import type { ChartConfig, ChartConfigEntry } from './chart-config';
import { getChartColor, readUnknownRecordValue } from './chart-config';
import { ChartConfigContext, useChartConfig } from './chart-config-context';

export type { ChartConfig, ChartConfigEntry };

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly config: ChartConfig;
  readonly children: React.ReactNode;
}

/**
 * Wraps a Recharts chart and provides config via context and CSS variables (--color-{key}).
 * Set min-h-[value] for responsive height. Use with ResponsiveContainer or chart responsive prop.
 */
export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps): React.ReactElement {
  const varStyle = React.useMemo((): React.CSSProperties => {
    const cssVars: Record<string, string> = {};
    for (const key of Object.keys(config)) {
      const entry = config[key];
      const color = entry?.color ?? entry?.theme?.light;
      if (color) {
        cssVars[`--color-${key}`] = color;
      }
    }
    return { ...style, ...cssVars };
  }, [config, style]);

  return (
    <ChartConfigContext.Provider value={config}>
      <ResponsiveContainer
        className={cn('w-full h-full', className)}
        height="100%"
        style={varStyle}
        width="100%"
        {...props}
      >
        {children}
      </ResponsiveContainer>
    </ChartConfigContext.Provider>
  );
}

export interface ChartTooltipContentProps {
  readonly active?: boolean;
  readonly formatter?: (
    item: unknown,
    name: string,
    value: unknown,
  ) => React.ReactNode;
  readonly hideIndicator?: boolean;
  readonly hideLabel?: boolean;
  readonly indicator?: 'dot' | 'line' | 'dashed';
  readonly label?: string | number;
  readonly labelKey?: string;
  readonly nameKey?: string;
  readonly payload?: ReadonlyArray<{
    color?: string;
    dataKey?: string;
    fill?: string;
    name?: string;
    payload?: unknown;
    value?: string | number;
  }>;
}

/**
 * Content component for chart tooltips. Use with Recharts Tooltip: content={<ChartTooltipContent />}.
 * Reads labels/colors from ChartContainer config via context.
 */
export function ChartTooltipContent({
  active,
  formatter,
  hideIndicator,
  hideLabel,
  indicator = 'dot',
  label,
  labelKey,
  nameKey = 'name',
  payload = [],
}: ChartTooltipContentProps): React.ReactElement | null {
  // Hooks
  const config = useChartConfig();

  // Setup

  // Handlers
  const nameForKey = (key: string): string => {
    const entry = config?.[key];
    if (entry?.label) return entry.label;

    const p = payload.find((item) => String(item.dataKey ?? item.name) === key);
    const raw = p ? readUnknownRecordValue(p.payload, nameKey) : undefined;

    return raw != null ? String(raw) : key;
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!active || payload.length === 0) return null;

  const labelValue = labelKey
    ? readUnknownRecordValue(payload[0]?.payload, labelKey)
    : label;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      {!hideLabel && labelValue != null && (
        <p className="mb-1.5 font-medium leading-none">{String(labelValue)}</p>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const name = nameForKey(key);
          const color = item.color ?? item.fill ?? getChartColor(config?.[key]);
          const isLine = indicator === 'line';
          const value = formatter
            ? formatter(item.value, name, item)
            : item.value;

          return (
            <div className="flex items-center gap-2" key={key}>
              {!hideIndicator && (
                <span
                  className="shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: color,
                    borderStyle: indicator === 'dashed' ? 'dashed' : undefined,
                    height: isLine || indicator === 'dashed' ? 2 : 8,
                    width: isLine || indicator === 'dashed' ? 12 : 8,
                  }}
                />
              )}
              <span className="flex-1 text-muted-foreground">{name}</span>
              <span className="font-medium">{Number(value).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ChartTooltipProps {
  readonly content?: React.ReactElement;
  readonly children?: never;
}

/**
 * Recharts Tooltip wired to ChartTooltipContent. Use inside a chart: <ChartTooltip content={<ChartTooltipContent />} />.
 */
export function ChartTooltip({
  content,
  ...props
}: ChartTooltipProps &
  React.ComponentProps<typeof RechartsTooltip>): React.ReactElement {
  return <RechartsTooltip {...props} content={content} />;
}

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
