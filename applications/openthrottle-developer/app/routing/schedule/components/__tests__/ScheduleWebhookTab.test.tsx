import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { scheduleWebhookTriggerFixture } from '~/testing/schedule-fixtures';

import type { ScheduleWebhookTabProps } from '../ScheduleWebhookTab';
import { ScheduleWebhookTab } from '../ScheduleWebhookTab';

const renderTab = (props: Partial<ScheduleWebhookTabProps> = {}) => {
  return renderRoutesStub(
    <ScheduleWebhookTab
      credentials={undefined}
      error={undefined}
      jobId="job-1"
      onDismissCredentials={vi.fn()}
      trigger={null}
      {...props}
    />,
  );
};

describe('ScheduleWebhookTab Component', () => {
  describe('with no trigger', () => {
    test('offers setup and the threat-model guidance, with no rotate or delete', () => {
      const view = renderTab();

      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.createAction }),
      ).toBeInTheDocument();
      expect(
        view.getByRole('heading', {
          name: SCHEDULE_WEBHOOK_COPY.threatHeading,
        }),
      ).toBeInTheDocument();
      expect(
        view.queryByRole('button', {
          name: SCHEDULE_WEBHOOK_COPY.rotateAction,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('with a trigger', () => {
    test('shows only the token prefix, the log link, rotate and delete', () => {
      const view = renderTab({
        trigger: scheduleWebhookTriggerFixture({ tokenPrefix: 'zzz999' }),
      });

      expect(view.getByText(/zzz999/)).toBeInTheDocument();
      expect(
        view.getByRole('link', {
          name: SCHEDULE_WEBHOOK_COPY.deliveriesAction,
        }),
      ).toHaveAttribute('href', '/schedule/job-1/deliveries');
      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.rotateAction }),
      ).toBeInTheDocument();
      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.deleteAction }),
      ).toBeInTheDocument();
      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.saveAction }),
      ).toBeInTheDocument();
    });
  });

  test('reveals the one-time credentials when it has them', () => {
    const view = renderTab({
      credentials: { secret: 'abc', webhookPath: '/webhooks/agent-jobs/t' },
    });

    expect(
      view.getByLabelText(SCHEDULE_WEBHOOK_COPY.revealSecretLabel),
    ).toHaveValue('abc');
  });
});
