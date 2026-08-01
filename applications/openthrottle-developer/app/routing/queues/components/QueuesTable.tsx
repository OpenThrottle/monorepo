import * as React from 'react';
import { Card, DataTable } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import clsx from 'clsx';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { QUEUES_TABLE_COLUMNS } from '~/routing/queues/data/queues-table-columns';
import { queueRowId } from '~/routing/queues/utils/queues-table';

export interface QueuesTableProps {
  className?: string;
  queues: QueueCardFragment[];
}

export const QueuesTable = (props: QueuesTableProps): React.ReactElement => {
  const { className, queues } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (queues.length === 0) {
    return (
      <Card className={clsx(className)} data-testid="QueuesTable">
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center sm:p-10">
          <OpenThrottleEmptyState
            description="When workers register Bull queues with the API, they appear here with live backlog, in-flight, and outcome counts."
            title="No queues"
          />
        </div>
      </Card>
    );
  }

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="QueuesTable"
    >
      <DataTable<QueueCardFragment, string | number | undefined>
        columns={QUEUES_TABLE_COLUMNS}
        data={queues}
        getRowId={queueRowId}
      />
    </div>
  );
};
