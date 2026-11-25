import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import {
  WEBHOOK_DELIVERY_STATUS_REASON,
  WEBHOOK_REJECT_REASON_LABEL,
} from '~/routing/schedule/data/webhook';

import { describeWebhookDeliveryReason } from '../describeWebhookDeliveryReason';

describe('describeWebhookDeliveryReason', () => {
  test('uses the reject reason of a rejected delivery', () => {
    expect(
      describeWebhookDeliveryReason({
        filterIndex: null,
        rejectReason: 'stale_timestamp',
        status: 'rejected',
      }),
    ).toBe(WEBHOOK_REJECT_REASON_LABEL.stale_timestamp);
  });

  test('passes an unknown reject reason through', () => {
    expect(
      describeWebhookDeliveryReason({
        filterIndex: null,
        rejectReason: 'brand_new',
        status: 'rejected',
      }),
    ).toBe('brand_new');
  });

  test('names the filter, one-based, for a filtered delivery', () => {
    expect(
      describeWebhookDeliveryReason({
        filterIndex: 0,
        rejectReason: null,
        status: 'filtered',
      }),
    ).toBe(`${SCHEDULE_WEBHOOK_COPY.deliveriesFilterPrefix} 1 did not match.`);
  });

  test('explains the other skips and leaves an accepted delivery blank', () => {
    expect(
      describeWebhookDeliveryReason({
        filterIndex: null,
        rejectReason: null,
        status: 'rate_limited',
      }),
    ).toBe(WEBHOOK_DELIVERY_STATUS_REASON.rate_limited);
    expect(
      describeWebhookDeliveryReason({
        filterIndex: null,
        rejectReason: null,
        status: 'accepted',
      }),
    ).toBe(SCHEDULE_WEBHOOK_COPY.deliveriesNoReason);
  });
});
