import type { ComponentType } from 'react';

/** Config entry for a single series (label, color, optional icon/theme). */
export interface ChartConfigEntry {
  readonly label?: string;
  readonly color?: string;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly theme?: { readonly light: string; readonly dark: string };
}

/** Map of data keys to chart config entries. Use with ChartContainer config prop. */
export type ChartConfig = Record<string, ChartConfigEntry>;

/**
 * @description Resolves color for a config key (supports theme or single color).
 */
export function getChartColor(
  config: ChartConfigEntry | undefined,
): string | undefined {
  if (!config) return undefined;
  if (config.color) return config.color;
  if (config.theme) return undefined; // consumer should set --color-* via CSS
  return undefined;
}

/**
 * @description Reads a string key from an unknown value (e.g. Recharts payload) without type assertions.
 */
export function readUnknownRecordValue(source: unknown, key: string): unknown {
  if (source == null || typeof source !== 'object') return undefined;
  if (!(key in source)) return undefined;
  return Reflect.get(source, key);
}
