import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { buildScheduleRunsTableColumns } from '~/routing/schedule/utils/schedule-runs-table-columns';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';

export interface ScheduleRunsTableProps {
  className?: string;
  jobId: string;
  runs: ScheduledJobRunRowFragment[];
}

export const ScheduleRunsTable = (
  props: ScheduleRunsTableProps,
): React.ReactElement => {
  const { className, jobId, runs } = props;

  // Hooks
  const columns = React.useMemo(
    () => buildScheduleRunsTableColumns(jobId),
    [jobId],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="ScheduleRunsTable"
    >
      <DataTable<ScheduledJobRunRowFragment, string | number | null | undefined>
        columns={columns}
        data={runs}
        emptyState="No runs yet."
      />
    </div>
  );
};
