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
import { RUN_STATUS_COLOR } from '~/routing/schedule/data/data.run-status';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { formatWhen } from '~/routing/schedule/utils/format-when';

export interface ScheduleTableProps {
  className?: string;
  /** In-flight run count per schedule id, from `buildInFlightByJob`. Absent ids are idle. */
  inFlightByJob?: Record<string, number>;
  jobs: ScheduledJobCardFragment[];
}

export const ScheduleTable = (
  props: ScheduleTableProps,
): React.ReactElement => {
  const { className, inFlightByJob = {}, jobs } = props;

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
              <div className="flex flex-wrap items-center gap-1">
                <Badge color={job.enabled ? 'green' : 'yellow'} size="xs">
                  {job.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {/* Additive, not a replacement: a disabled schedule with a
                    manual run in flight is a real state, and hiding either half
                    of it would misreport what the row is doing. */}
                {inFlightByJob[job.id] ? (
                  <Badge color={RUN_STATUS_COLOR.running} variant="default">
                    {SCHEDULE_COPY.tableRunningBadge}
                    {inFlightByJob[job.id] > 1
                      ? ` ×${inFlightByJob[job.id]}`
                      : ''}
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{formatWhen(job.nextRunAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
