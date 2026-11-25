import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { scheduleWebhookTriggerFixture } from '~/testing/schedule-fixtures';

import { ScheduleWebhookStatusBar } from '../ScheduleWebhookStatusBar';

describe('ScheduleWebhookStatusBar Component', () => {
  test('shows the state, the token prefix and the delivery-log link', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookStatusBar
        jobId="job-1"
        trigger={scheduleWebhookTriggerFixture({ tokenPrefix: 'qqq111' })}
      />,
    );

    expect(
      view.getByText(SCHEDULE_WEBHOOK_COPY.statusEnabled),
    ).toBeInTheDocument();
    expect(view.getByText(/qqq111/)).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: SCHEDULE_WEBHOOK_COPY.deliveriesAction }),
    ).toHaveAttribute('href', '/schedule/job-1/deliveries');
    expect(
      view.queryByText(new RegExp(SCHEDULE_WEBHOOK_COPY.rotatedLabel)),
    ).not.toBeInTheDocument();
  });

  test('says the webhook is off and when it was last rotated', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookStatusBar
        jobId="job-1"
        trigger={scheduleWebhookTriggerFixture({
          enabled: false,
          rotatedAt: '2026-08-01T00:00:00.000Z',
        })}
      />,
    );

    expect(
      view.getByText(SCHEDULE_WEBHOOK_COPY.statusDisabled),
    ).toBeInTheDocument();
    expect(
      view.getByText(new RegExp(SCHEDULE_WEBHOOK_COPY.rotatedLabel)),
    ).toBeInTheDocument();
  });
});
