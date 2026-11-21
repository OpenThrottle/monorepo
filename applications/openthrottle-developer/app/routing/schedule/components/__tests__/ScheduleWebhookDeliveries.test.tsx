import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { WEBHOOK_REJECT_REASON_LABEL } from '~/routing/schedule/data/data.webhook';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { scheduleWebhookDeliveryFixture } from '~/testing/schedule-fixtures';

import { ScheduleWebhookDeliveries } from '../ScheduleWebhookDeliveries';

describe('ScheduleWebhookDeliveries Component', () => {
  test('shows the empty state with no deliveries', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookDeliveries deliveries={[]} jobId="job-1" />,
    );

    expect(
      view.getByText(SCHEDULE_WEBHOOK_COPY.deliveriesEmpty),
    ).toBeInTheDocument();
  });

  test('links an accepted delivery to its run and offers its prompt', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookDeliveries
        deliveries={[scheduleWebhookDeliveryFixture()]}
        jobId="job-1"
      />,
    );

    expect(
      view.getByRole('link', { name: SCHEDULE_WEBHOOK_COPY.deliveriesViewRun }),
    ).toHaveAttribute('href', '/schedule/job-1/runs/run-1');
    expect(
      view.getByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.deliveriesPromptShow,
      }),
    ).toBeInTheDocument();
    expect(view.getByText('delivery-1')).toBeInTheDocument();
    expect(view.getByText('202')).toBeInTheDocument();
  });

  test('explains a rejection and has no run to link', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookDeliveries
        deliveries={[
          scheduleWebhookDeliveryFixture({
            dedupeKey: null,
            httpStatus: 401,
            id: 'delivery-2',
            rejectReason: 'bad_signature',
            renderedPrompt: null,
            runId: null,
            status: 'rejected',
          }),
        ]}
        jobId="job-1"
      />,
    );

    expect(
      view.getByText(WEBHOOK_REJECT_REASON_LABEL.bad_signature ?? ''),
    ).toBeInTheDocument();
    expect(view.queryByRole('link')).not.toBeInTheDocument();
    expect(
      view.getByText(SCHEDULE_WEBHOOK_COPY.deliveriesNoPrompt),
    ).toBeInTheDocument();
  });

  test('names the filter that excluded a filtered delivery', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookDeliveries
        deliveries={[
          scheduleWebhookDeliveryFixture({
            filterIndex: 1,
            runId: null,
            status: 'filtered',
          }),
        ]}
        jobId="job-1"
      />,
    );

    expect(
      view.getByText(
        `${SCHEDULE_WEBHOOK_COPY.deliveriesFilterPrefix} 2 did not match.`,
      ),
    ).toBeInTheDocument();
  });
});
