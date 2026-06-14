/**
 * @description Displays current process snapshot (rssMb, heap, external, CPU) from GET /metrics. Uses {@link useServerMetrics}; refresh on demand or optional polling.
 */

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import type { ProcessMetricsSnapshot } from '../data/metrics-types';
import { useServerMetrics } from '../hooks/useServerMetrics';

/** Format MB to 2 decimal places for display. */
function formatMb(value: number): string {
  return value.toFixed(2);
}

/** Format CPU ms (cumulative) for display; integer when reasonable. */
function formatCpuMs(value: number): string {
  return Number(value.toFixed(0)).toLocaleString();
}

const METRIC_ROWS: ReadonlyArray<{
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

export interface ServerMetricsCardProps {
  /** API base URL for openthrottle-server. Defaults to config. */
  readonly apiBaseUrl?: string;
  readonly className?: string;
  /** Poll interval in ms. 0 = on-demand only (use Refresh button). Default 0. */
  readonly intervalMs?: number;
}

/**
 * @description Renders a card with current server process metrics (memory and CPU). Supports on-demand refresh or optional polling per {@link ServerMetricsCardProps.intervalMs}.
 */
export function ServerMetricsCard(
  props: ServerMetricsCardProps,
): React.ReactElement {
  const { apiBaseUrl, className, intervalMs = 0 } = props;

  const { error, loading, refetch, serverMetrics } = useServerMetrics({
    apiBaseUrl,
    intervalMs,
  });

  const handleRefresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Card className={className} data-testid="ServerMetricsCard">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Server metrics</CardTitle>
        <Button
          aria-label="Refresh metrics"
          data-testid="ServerMetricsCard-refresh"
          disabled={loading}
          onClick={handleRefresh}
          size="sm"
          variant="outline"
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && serverMetrics == null && (
          <div className="space-y-2" data-testid="ServerMetricsCard-loading">
            {METRIC_ROWS.map(({ key }) => (
              <Skeleton className="h-8 w-full" key={key} />
            ))}
          </div>
        )}
        {error != null && (
          <p
            className="text-destructive text-sm"
            data-testid="ServerMetricsCard-error"
            role="alert"
          >
            {error.message}
          </p>
        )}
        {!loading && error == null && serverMetrics != null && (
          <Table data-testid="ServerMetricsCard-table">
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRIC_ROWS.map(({ key, label, unit, format }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    {label} ({unit})
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {format(serverMetrics[key])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
