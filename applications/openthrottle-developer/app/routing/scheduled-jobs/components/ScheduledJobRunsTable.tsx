import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import { RUN_STATUS_VARIANT } from '~/routing/scheduled-jobs/data/data.run-status';
import { formatDuration } from '~/routing/scheduled-jobs/utils/format-duration';
import {
  formatRunCost,
  formatRunTotalTokens,
  runUsageTooltip,
} from '~/routing/scheduled-jobs/utils/format-usage';
import { formatWhen } from '~/routing/scheduled-jobs/utils/format-when';

export interface ScheduledJobRunsTableProps {
  className?: string;
  jobId: string;
  runs: ScheduledJobRunRowFragment[];
}

export const ScheduledJobRunsTable = (
  props: ScheduledJobRunsTableProps,
): React.ReactElement => {
  const { className, jobId, runs } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className={className} data-testid="ScheduledJobRunsTable">
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead>Exit</TableHead>
          <TableHead>
            <span className="sr-only">Open run</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              <Badge
                title={run.errorMessage ?? undefined}
                variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}
              >
                {run.status}
              </Badge>
            </TableCell>
            <TableCell>{run.trigger}</TableCell>
            <TableCell className="font-mono text-xs">
              {run.model ?? '—'}
            </TableCell>
            <TableCell>{formatWhen(run.startedAt)}</TableCell>
            <TableCell>{formatWhen(run.finishedAt)}</TableCell>
            <TableCell>
              {formatDuration(run.startedAt, run.finishedAt)}
            </TableCell>
            <TableCell
              className="text-right tabular-nums"
              title={runUsageTooltip(run)}
            >
              {formatRunTotalTokens(run)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatRunCost(run)}
            </TableCell>
            <TableCell>{run.exitCode ?? '—'}</TableCell>
            <TableCell className="text-right">
              <Link
                className="text-primary text-sm underline-offset-4 hover:underline"
                to={`/scheduled-jobs/${jobId}/runs/${run.id}`}
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
