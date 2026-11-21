import type { ScheduleWebhookDeliveryRowFragment } from '~/__generated__/graphql';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import {
  WEBHOOK_DELIVERY_STATUS_REASON,
  WEBHOOK_REJECT_REASON_LABEL,
} from '~/routing/schedule/data/data.webhook';

export type WebhookDeliveryReasonInput = Pick<
  ScheduleWebhookDeliveryRowFragment,
  'filterIndex' | 'rejectReason' | 'status'
>;

/**
 * @description Why the server answered a delivery the way it did. A rejection carries its own reason
 * code, a filtered delivery names the filter that excluded it, and the other skips have a fixed
 * explanation. An accepted delivery has nothing to explain.
 */
export const describeWebhookDeliveryReason = (
  delivery: WebhookDeliveryReasonInput,
): string => {
  if (delivery.rejectReason != null) {
    return (
      WEBHOOK_REJECT_REASON_LABEL[delivery.rejectReason] ??
      delivery.rejectReason
    );
  }

  if (delivery.status === 'filtered' && delivery.filterIndex != null) {
    return `${SCHEDULE_WEBHOOK_COPY.deliveriesFilterPrefix} ${delivery.filterIndex + 1} did not match.`;
  }

  return (
    WEBHOOK_DELIVERY_STATUS_REASON[delivery.status] ??
    SCHEDULE_WEBHOOK_COPY.deliveriesNoReason
  );
};
