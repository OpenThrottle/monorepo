/**
 * @description Row configuration for the metrics tables (label, unit, snapshot
 * key, and display formatter). Shared by ServerMetricsCard and
 * TaskRunMetricsCard; hoisted out of the components per
 * component-primitive-shape R4.
 */

import { formatCpuMs, formatMb } from '../utils/format-metric';
import type { ProcessMetricsSnapshot } from './metrics-types';

export const METRIC_ROWS: ReadonlyArray<{
  readonly format: (v: number) => string;
  readonly key: keyof ProcessMetricsSnapshot;
  readonly label: string;
  readonly unit: string;
}> = [
  { format: formatMb, key: 'rssMb', label: 'RSS', unit: 'MB' },
  { format: formatMb, key: 'heapUsedMb', label: 'Heap used', unit: 'MB' },
  { format: formatMb, key: 'heapTotalMb', label: 'Heap total', unit: 'MB' },
  { format: formatMb, key: 'externalMb', label: 'External', unit: 'MB' },
  { format: formatCpuMs, key: 'cpuUserMs', label: 'CPU user', unit: 'ms' },
  { format: formatCpuMs, key: 'cpuSystemMs', label: 'CPU system', unit: 'ms' },
];
