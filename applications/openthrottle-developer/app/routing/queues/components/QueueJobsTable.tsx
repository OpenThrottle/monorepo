import * as React from 'react';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import clsx from 'clsx';
import {
  buildQueueJobsTableColumns,
  queueJobRowId,
} from '~/routing/queues/utils/queue-jobs-table-columns';
import type { QueueJobDetailsFragment } from '~/__generated__/graphql';

export interface QueueJobsTableProps {
  className?: string;
  jobs: readonly QueueJobDetailsFragment[];
  queueName: string;
}

/**
 * @description Dense, scannable jobs table for queue detail index; drill-down via job detail route.
 */
export const QueueJobsTable = (
  props: QueueJobsTableProps,
): React.ReactElement => {
  const { className, jobs, queueName } = props;

  // Hooks
  const columns = React.useMemo(
    () => buildQueueJobsTableColumns(queueName),
    [queueName],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="QueueJobsTable"
    >
      <DataTable<QueueJobDetailsFragment, string | number | null | undefined>
        columns={columns}
        data={[...jobs]}
        emptyState={
          <OpenThrottleEmptyState
            description="Try again later."
            title="No jobs in this queue."
          />
        }
        getRowId={queueJobRowId}
      />
    </div>
  );
};
