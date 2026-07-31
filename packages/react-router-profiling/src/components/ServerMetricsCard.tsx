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
import { METRIC_ROWS } from '../data/metric-rows';
import { useServerMetrics } from '../hooks/useServerMetrics';

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
export const ServerMetricsCard = (
  props: ServerMetricsCardProps,
): React.ReactElement => {
  const { apiBaseUrl, className, intervalMs = 0 } = props;

  // Hooks
  const { error, loading, refetch, serverMetrics } = useServerMetrics({
    apiBaseUrl,
    intervalMs,
  });

  // Setup

  // Handlers
  const handleRefresh = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
};
