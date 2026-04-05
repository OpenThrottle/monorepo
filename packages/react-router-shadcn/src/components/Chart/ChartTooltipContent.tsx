'use client';

import * as React from 'react';
import { getChartColor, readUnknownRecordValue } from '../chart-config';
import { useChartConfig } from '../chart-config-context';

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
export const ChartTooltipContent = (
  props: ChartTooltipContentProps,
): React.ReactElement | null => {
  const {
    active,
    formatter,
    hideIndicator,
    hideLabel,
    indicator = 'dot',
    label,
    labelKey,
    nameKey = 'name',
    payload = [],
  } = props;

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
              <span className="font-medium">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

ChartTooltipContent.displayName = 'ChartTooltipContent';
