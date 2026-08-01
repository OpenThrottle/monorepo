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
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { formatWhen } from '~/routing/scheduled-jobs/utils/format-when';

export interface ScheduledJobsTableProps {
  className?: string;
  jobs: ScheduledJobCardFragment[];
}

export const ScheduledJobsTable = (
  props: ScheduledJobsTableProps,
): React.ReactElement => {
  const { className, jobs } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className={className} data-testid="ScheduledJobsTable">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Next run</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <Link
                className="font-medium underline-offset-4 hover:underline"
                to={`/scheduled-jobs/${job.id}`}
              >
                {job.name}
              </Link>
            </TableCell>
            <TableCell>
              {job.driverId}
              {job.model ? ` · ${job.model}` : ''}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {job.cronPattern}
              {job.timezone ? ` (${job.timezone})` : ''}
            </TableCell>
            <TableCell>
              <Badge variant={job.enabled ? 'default' : 'secondary'}>
                {job.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </TableCell>
            <TableCell>{formatWhen(job.nextRunAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
