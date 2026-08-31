import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { buildScheduleTableColumns } from '~/routing/schedule/utils/schedule-table-columns';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';

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
  const columns = React.useMemo(
    () => buildScheduleTableColumns(inFlightByJob),
    [inFlightByJob],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      // className={clsx('ui-border rounded-lg border [&_tbody_tr_td]:hover:py-4 [&_tbody_tr_td]:transition-all [&_tbody_tr_td]:duration-500', className)}
      data-testid="ScheduleTable"
    >
      <DataTable<ScheduledJobCardFragment, string | number | null | undefined>
        columns={columns}
        data={jobs}
      />
    </div>
  );
};
