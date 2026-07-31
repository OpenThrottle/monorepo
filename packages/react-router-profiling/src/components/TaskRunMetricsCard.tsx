/**
 * @description Displays task-run metrics (atStart, atEnd) and deltas from a plans-queue job. Uses {@link useJobTaskRunMetrics}. Includes interpretation hints per server-and-task-metrics.md §6.4.
 */

import * as React from 'react';
import {
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
import { TASK_RUN_INTERPRETATION_HINTS } from '../data/data.copy';
import { METRIC_ROWS } from '../data/metric-rows';
import { computeTaskRunDeltas } from '../data/task-run-metrics-deltas';
import { useJobTaskRunMetrics } from '../hooks/useJobTaskRunMetrics';

export interface TaskRunMetricsCardProps {
  /** API base URL for openthrottle-server. Defaults to config. */
  readonly apiBaseUrl?: string;
  readonly className?: string;
  /** Plans-queue job ID. When null or empty, shows empty state. */
  readonly jobId: string | null;
}

/**
 * @description Renders a card with task-run metrics (atStart, atEnd, deltas) for a plans-queue job. Shows interpretation hints per server-and-task-metrics.md §6.4.
 */
export const TaskRunMetricsCard = (
  props: TaskRunMetricsCardProps,
): React.ReactElement => {
  const { apiBaseUrl, className, jobId } = props;

  // Hooks
  const { error, job, loading } = useJobTaskRunMetrics(jobId, { apiBaseUrl });

  // Setup
  const hasJobNoMetrics =
    !loading && error == null && job != null && job.taskRunMetrics == null;
  const metrics = job?.taskRunMetrics ?? null;
  const deltas =
    metrics != null
      ? computeTaskRunDeltas(metrics.atStart, metrics.atEnd)
      : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="TaskRunMetricsCard">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Task-run metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(jobId == null || jobId === '') && (
          <p
            className="text-muted-foreground text-sm"
            data-testid="TaskRunMetricsCard-empty"
          >
            Provide a job ID to load task-run metrics.
          </p>
        )}
        {jobId != null && jobId !== '' && loading && metrics == null && (
          <div className="space-y-2" data-testid="TaskRunMetricsCard-loading">
            {METRIC_ROWS.map(({ key }) => (
              <Skeleton className="h-8 w-full" key={key} />
            ))}
          </div>
        )}
        {jobId != null && jobId !== '' && error != null && (
          <p
            className="text-destructive text-sm"
            data-testid="TaskRunMetricsCard-error"
            role="alert"
          >
            {error.message}
          </p>
        )}
        {jobId != null && jobId !== '' && hasJobNoMetrics && (
          <p
            className="text-muted-foreground text-sm"
            data-testid="TaskRunMetricsCard-no-metrics"
          >
            No metrics for this run.
          </p>
        )}
        {jobId != null && jobId !== '' && metrics != null && deltas != null && (
          <>
            <Table data-testid="TaskRunMetricsCard-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">End</TableHead>
                  <TableHead className="text-right">Δ (delta)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRIC_ROWS.map(({ key, label, unit, format }) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      {label} ({unit})
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {format(metrics.atStart[key])}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {format(metrics.atEnd[key])}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {format(deltas[key])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div
              className="border-muted border-t pt-3"
              data-testid="TaskRunMetricsCard-interpretation"
            >
              <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                How to interpret
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
                {TASK_RUN_INTERPRETATION_HINTS.map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
