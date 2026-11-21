import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
/**
 * @description Column definitions for {@link ScheduleWebhookDeliveries}. Hoisted from the component
 * file per component-primitive-shape R4 so the table component stays UI-focused.
 */
import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { ScheduleWebhookDeliveryRowFragment } from '~/__generated__/graphql';
import { ScheduleWebhookRenderedPrompt } from '~/routing/schedule/components/ScheduleWebhookRenderedPrompt';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import {
  WEBHOOK_DELIVERY_STATUS_COLOR,
  WEBHOOK_DELIVERY_STATUS_LABEL,
} from '~/routing/schedule/data/data.webhook';
import { describeWebhookDeliveryReason } from '~/routing/schedule/utils/describeWebhookDeliveryReason';
import { formatWhen } from '~/routing/schedule/utils/formatWhen';

const renderRunCell = (
  jobId: string,
  runId: string | null | undefined,
): React.ReactNode => {
  if (!runId) {
    return '—';
  }

  return (
    <Link
      className="underline-offset-4 hover:underline"
      to={`/schedule/${jobId}/runs/${runId}`}
    >
      {SCHEDULE_WEBHOOK_COPY.deliveriesViewRun}
    </Link>
  );
};

export const buildScheduleWebhookDeliveryColumns = (
  jobId: string,
): DataTableColumnDef<
  ScheduleWebhookDeliveryRowFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'receivedAt',
      cell: ({ row }) => (
        <div className="p-2">{formatWhen(row.original.receivedAt)}</div>
      ),
      header: () => (
        <div className="p-2">
          {SCHEDULE_WEBHOOK_COPY.deliveriesColumnReceived}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => (
        <div className="p-2">
          <Badge
            color={
              WEBHOOK_DELIVERY_STATUS_COLOR[row.original.status] ?? 'slate'
            }
            size="xs"
          >
            {WEBHOOK_DELIVERY_STATUS_LABEL[row.original.status] ??
              row.original.status}
          </Badge>
        </div>
      ),
      header: () => (
        <div className="p-2">
          {SCHEDULE_WEBHOOK_COPY.deliveriesColumnStatus}
        </div>
      ),
    },
    {
      accessorKey: 'rejectReason',
      cell: ({ row }) => (
        <div className="max-w-64 p-2">
          {describeWebhookDeliveryReason(row.original)}
        </div>
      ),
      header: () => (
        <div className="p-2">
          {SCHEDULE_WEBHOOK_COPY.deliveriesColumnReason}
        </div>
      ),
    },
    {
      accessorKey: 'httpStatus',
      cell: ({ row }) => <div className="p-2">{row.original.httpStatus}</div>,
      header: () => (
        <div className="p-2">{SCHEDULE_WEBHOOK_COPY.deliveriesColumnHttp}</div>
      ),
    },
    {
      accessorKey: 'dedupeKey',
      cell: ({ row }) => (
        <div className="max-w-48 truncate p-2 font-mono text-xs">
          {row.original.dedupeKey ?? '—'}
        </div>
      ),
      header: () => (
        <div className="p-2">
          {SCHEDULE_WEBHOOK_COPY.deliveriesColumnDedupeKey}
        </div>
      ),
    },
    {
      accessorKey: 'runId',
      cell: ({ row }) => (
        <div className="p-2">{renderRunCell(jobId, row.original.runId)}</div>
      ),
      header: () => (
        <div className="p-2">{SCHEDULE_WEBHOOK_COPY.deliveriesColumnRun}</div>
      ),
    },
    {
      cell: ({ row }) => (
        <div className="min-w-48 p-2">
          <ScheduleWebhookRenderedPrompt prompt={row.original.renderedPrompt} />
        </div>
      ),
      header: () => (
        <div className="p-2">
          {SCHEDULE_WEBHOOK_COPY.deliveriesColumnPrompt}
        </div>
      ),
      id: 'renderedPrompt',
    },
  ];
};
