import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { ScheduleWebhookCredentials } from '../ScheduleWebhookCredentials';

const originalEnv = window.env;

afterEach(() => {
  window.env = originalEnv;
});

describe('ScheduleWebhookCredentials Component', () => {
  test('shows the full URL (public origin + path) and the secret once, with a warning', () => {
    window.env = {
      ...originalEnv,
      API_URL_EXTERNAL: 'https://api.example.test/',
    };
    const view = renderRoutesStub(
      <ScheduleWebhookCredentials
        credentials={{
          secret: 's3cret',
          webhookPath: '/webhooks/agent-jobs/tok',
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(
      view.getByLabelText(SCHEDULE_WEBHOOK_COPY.revealUrlLabel),
    ).toHaveValue('https://api.example.test/webhooks/agent-jobs/tok');
    expect(
      view.getByLabelText(SCHEDULE_WEBHOOK_COPY.revealSecretLabel),
    ).toHaveValue('s3cret');
    expect(view.getByRole('alert')).toHaveTextContent(
      SCHEDULE_WEBHOOK_COPY.revealWarning,
    );
    expect(
      view.getByRole('button', {
        name: `${SCHEDULE_WEBHOOK_COPY.copyAction} URL`,
      }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', {
        name: `${SCHEDULE_WEBHOOK_COPY.copyAction} secret`,
      }),
    ).toBeInTheDocument();
  });

  test('calls onDismiss when the person has copied them', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const view = renderRoutesStub(
      <ScheduleWebhookCredentials
        credentials={{ secret: 's', webhookPath: '/p' }}
        onDismiss={onDismiss}
      />,
    );

    await user.click(
      view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.revealDismiss }),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
