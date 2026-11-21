import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';
import { scheduleWebhookTriggerFixture } from '~/testing/schedule-fixtures';

import { ScheduleWebhookForm } from '../ScheduleWebhookForm';

describe('ScheduleWebhookForm Component', () => {
  describe('when creating', () => {
    test('offers Create, posts the create intent and starts on the generic preset', () => {
      const view = renderRoutesStub(
        <ScheduleWebhookForm error={undefined} trigger={undefined} />,
      );

      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.createAction }),
      ).toBeInTheDocument();
      expect(
        view.getByRole('combobox', { name: SCHEDULE_WEBHOOK_COPY.presetLabel }),
      ).toHaveTextContent('Generic');
      expect(
        view.getByLabelText(SCHEDULE_WEBHOOK_COPY.toleranceLabel),
      ).toHaveValue(300);
      expect(
        view.queryByLabelText(SCHEDULE_WEBHOOK_COPY.customSignatureHeaderLabel),
      ).not.toBeInTheDocument();
    });

    test('submits the parsed form fields', async () => {
      const user = userEvent.setup();
      const submissions: Record<string, FormDataEntryValue>[] = [];
      const view = renderWithMemoryRouter([
        {
          action: async ({
            request,
          }: {
            request: Request;
          }): Promise<{ ok: boolean }> => {
            const form = await request.formData();
            submissions.push(Object.fromEntries(form.entries()));
            return { ok: true };
          },
          element: (
            <ScheduleWebhookForm error={undefined} trigger={undefined} />
          ),
          loader: (): null => null,
          path: '/',
        },
      ]);

      await user.click(
        await view.findByRole('button', {
          name: SCHEDULE_WEBHOOK_COPY.filterAdd,
        }),
      );
      await user.type(
        view.getByLabelText(`${SCHEDULE_WEBHOOK_COPY.filterPathLabel} 1`),
        'action',
      );
      await user.type(
        view.getByLabelText(`${SCHEDULE_WEBHOOK_COPY.filterValueLabel} 1`),
        'opened',
      );
      await user.click(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.createAction }),
      );

      await waitFor(() => expect(submissions).toHaveLength(1));
      expect(submissions[0]).toMatchObject({
        filterOp: 'equals',
        filterPath: 'action',
        filterValue: 'opened',
        intent: 'webhook-create',
        maxInFlight: '3',
        rateLimitPerMinute: '30',
        signaturePreset: 'generic',
      });
    });
  });

  describe('when editing', () => {
    test('offers Save, posts the update intent and shows the saved values', () => {
      const view = renderRoutesStub(
        <ScheduleWebhookForm
          error={undefined}
          trigger={scheduleWebhookTriggerFixture({ maxInFlight: 7 })}
        />,
      );

      expect(
        view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.saveAction }),
      ).toBeInTheDocument();
      expect(
        view.getByLabelText(SCHEDULE_WEBHOOK_COPY.maxInFlightLabel),
      ).toHaveValue(7);
    });

    test('shows custom header fields for a custom preset and no tolerance for github', () => {
      const custom = renderRoutesStub(
        <ScheduleWebhookForm
          error={undefined}
          trigger={scheduleWebhookTriggerFixture({ signaturePreset: 'custom' })}
        />,
      );

      expect(
        custom.getByLabelText(SCHEDULE_WEBHOOK_COPY.customSignatureHeaderLabel),
      ).toBeInTheDocument();
      custom.unmount();

      const github = renderRoutesStub(
        <ScheduleWebhookForm
          error={undefined}
          trigger={scheduleWebhookTriggerFixture({ signaturePreset: 'github' })}
        />,
      );

      expect(
        github.queryByLabelText(SCHEDULE_WEBHOOK_COPY.toleranceLabel),
      ).not.toBeInTheDocument();
    });
  });

  test('shows an action error inline', () => {
    const view = renderRoutesStub(
      <ScheduleWebhookForm error="Key missing." trigger={undefined} />,
    );

    expect(view.getByRole('alert')).toHaveTextContent('Key missing.');
  });
});
