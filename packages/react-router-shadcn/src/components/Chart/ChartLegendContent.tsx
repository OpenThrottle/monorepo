'use client';

import * as React from 'react';
import { getChartColor, readUnknownRecordValue } from '../chart-config';
import { useChartConfig } from '../chart-config-context';

export interface ChartLegendContentProps {
  readonly payload?: ReadonlyArray<{
    color?: string;
    dataKey?: string;
    value?: string;
  }>;
  readonly nameKey?: string;
}

/**
 * Content component for chart legend. Use with Recharts Legend: content={<ChartLegendContent />}.
 */
export const ChartLegendContent = (
  props: ChartLegendContentProps,
): React.ReactElement | null => {
  const { nameKey, payload = [] } = props;

  // Hooks
  const config = useChartConfig();

  // Setup

  // Handlers
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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (payload.length === 0) return null;

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
};

ChartLegendContent.displayName = 'ChartLegendContent';
