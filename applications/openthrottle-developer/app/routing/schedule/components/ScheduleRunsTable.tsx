import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import { collectResumedRunIds } from '~/global/utils/utils.usage-limit';
import { buildScheduleRunsTableColumns } from '~/routing/schedule/utils/buildScheduleRunsTableColumns';

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
  const resumedRunIds = React.useMemo(() => collectResumedRunIds(runs), [runs]);
  const columns = React.useMemo(
    () => buildScheduleRunsTableColumns(jobId, resumedRunIds),
    [jobId, resumedRunIds],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
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
