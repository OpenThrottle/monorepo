import * as React from 'react';
import { Card, DataTable, toast } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import clsx from 'clsx';
import { useFetcher } from 'react-router';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  buildQueuesTableColumns,
  type QueueControlIntent,
} from '~/routing/queues/data/queues-table-columns';
import { queueRowId } from '~/routing/queues/utils/queues-table';

export interface QueuesTableProps {
  className?: string;
  queues: QueueCardFragment[];
}

/** Action-result payload from the `/queues` route, surfaced as a toast. */
export interface QueuesTableActionData {
  error?: string;
  paused?: string;
  resumed?: string;
}

export const QueuesTable = (props: QueuesTableProps): React.ReactElement => {
  const { className, queues } = props;

  // Hooks
  const fetcher = useFetcher<QueuesTableActionData>();
  const handledRef = React.useRef<QueuesTableActionData | null>(null);

  const submitControl = React.useCallback(
    (queueName: string, intent: QueueControlIntent) => {
      fetcher.submit({ intent, queueName }, { method: 'post' });
    },
    [fetcher],
  );

  const columns = React.useMemo(
    () => buildQueuesTableColumns(submitControl),
    [submitControl],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }
    if (handledRef.current === fetcher.data) {
      return;
    }
    handledRef.current = fetcher.data;

    const data = fetcher.data;
    if (data.error != null && data.error !== '') {
      toast.error(data.error);
    } else if (data.paused != null && data.paused !== '') {
      toast.success(`Paused ${data.paused}`);
    } else if (data.resumed != null && data.resumed !== '') {
      toast.success(`Resumed ${data.resumed}`);
    }
  }, [fetcher.state, fetcher.data]);

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
        columns={columns}
        data={queues}
        getRowId={queueRowId}
      />
    </div>
  );
};
