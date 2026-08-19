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
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { formatWhen } from '~/routing/schedule/utils/format-when';

export interface ScheduleTableProps {
  className?: string;
  jobs: ScheduledJobCardFragment[];
}

export const ScheduleTable = (
  props: ScheduleTableProps,
): React.ReactElement => {
  const { className, jobs } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className={className} data-testid="ScheduleTable">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>{SCHEDULE_COPY.repositoryColumnLabel}</TableHead>
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
                to={`/schedule/${job.id}`}
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
              {job.repository?.displayName ??
                SCHEDULE_COPY.repositoryNoneOption}
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
