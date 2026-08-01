import * as React from 'react';
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
import { formatWhen } from '~/routing/scheduled-jobs/utils/format-when';

export interface ScheduledJobRunsTableProps {
  className?: string;
  runs: ScheduledJobRunRowFragment[];
}

export const ScheduledJobRunsTable = (
  props: ScheduledJobRunsTableProps,
): React.ReactElement => {
  const { className, runs } = props;

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
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead>Exit</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}>
                {run.status}
              </Badge>
            </TableCell>
            <TableCell>{run.trigger}</TableCell>
            <TableCell>{formatWhen(run.startedAt)}</TableCell>
            <TableCell>{formatWhen(run.finishedAt)}</TableCell>
            <TableCell>{run.exitCode ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate text-xs">
              {run.errorMessage ?? ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
