import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import { scheduleWebhookTriggerFixture } from '~/testing/schedule-fixtures';

import { ScheduleWebhookCustomFields } from '../ScheduleWebhookCustomFields';

describe('ScheduleWebhookCustomFields Component', () => {
  test('renders blank, named header fields on create', () => {
    const component = render(
      <ScheduleWebhookCustomFields trigger={undefined} />,
    );
    const signature = component.getByLabelText(
      SCHEDULE_WEBHOOK_COPY.customSignatureHeaderLabel,
    );

    expect(signature).toHaveAttribute('name', 'signatureHeader');
    expect(signature).toHaveValue('');
    expect(
      component.getByLabelText(
        SCHEDULE_WEBHOOK_COPY.customTimestampHeaderLabel,
      ),
    ).toHaveAttribute('name', 'timestampHeader');
    expect(
      component.getByLabelText(
        SCHEDULE_WEBHOOK_COPY.customDeliveryIdHeaderLabel,
      ),
    ).toHaveAttribute('name', 'deliveryIdHeader');
  });

  test('pre-fills the saved headers on edit', () => {
    const component = render(
      <ScheduleWebhookCustomFields
        trigger={scheduleWebhookTriggerFixture({
          deliveryIdHeader: 'X-Id',
          signatureHeader: 'X-Sig',
          timestampHeader: null,
        })}
      />,
    );

    expect(
      component.getByLabelText(
        SCHEDULE_WEBHOOK_COPY.customSignatureHeaderLabel,
      ),
    ).toHaveValue('X-Sig');
    expect(
      component.getByLabelText(
        SCHEDULE_WEBHOOK_COPY.customTimestampHeaderLabel,
      ),
    ).toHaveValue('');
    expect(
      component.getByLabelText(
        SCHEDULE_WEBHOOK_COPY.customDeliveryIdHeaderLabel,
      ),
    ).toHaveValue('X-Id');
  });
});
