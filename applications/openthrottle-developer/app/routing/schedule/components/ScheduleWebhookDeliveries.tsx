import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduleWebhookDeliveryRowFragment } from '~/__generated__/graphql';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { buildScheduleWebhookDeliveryColumns } from '~/routing/schedule/utils/buildScheduleWebhookDeliveryColumns';

export interface ScheduleWebhookDeliveriesProps {
  readonly className?: string;
  readonly deliveries: readonly ScheduleWebhookDeliveryRowFragment[];
  /** The job id, used to link a delivery to the run it started. */
  readonly jobId: string;
}

/**
 * @description The delivery log of a job's webhook: one row per request that matched the trigger,
 * rejections included, with the HTTP status the sender got, the accept / reject reason, the dedupe
 * key, a link to the run when there is one, and the rendered prompt on demand. It answers "why
 * didn't my webhook run?".
 */
export const ScheduleWebhookDeliveries = (
  props: ScheduleWebhookDeliveriesProps,
): React.ReactElement => {
  const { className, deliveries, jobId } = props;

  // Hooks
  const columns = React.useMemo(
    () => buildScheduleWebhookDeliveryColumns(jobId),
    [jobId],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
      data-testid="ScheduleWebhookDeliveries"
    >
      <DataTable<
        ScheduleWebhookDeliveryRowFragment,
        string | number | null | undefined
      >
        columns={columns}
        data={[...deliveries]}
        emptyState={SCHEDULE_WEBHOOK_COPY.deliveriesEmpty}
      />
    </div>
  );
};
