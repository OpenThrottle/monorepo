import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

import { ScheduleWebhookConfirmAction } from '../ScheduleWebhookConfirmAction';

const renderRotate = (intents: (FormDataEntryValue | null)[]) => {
  return renderWithMemoryRouter([
    {
      action: async ({
        request,
      }: {
        request: Request;
      }): Promise<{ ok: boolean }> => {
        intents.push((await request.formData()).get('intent'));
        return { ok: true };
      },
      element: (
        <ScheduleWebhookConfirmAction
          confirmLabel={SCHEDULE_WEBHOOK_COPY.rotateConfirm}
          description={SCHEDULE_WEBHOOK_COPY.rotateDescription}
          intent="webhook-rotate"
          title={SCHEDULE_WEBHOOK_COPY.rotateTitle}
          triggerLabel={SCHEDULE_WEBHOOK_COPY.rotateAction}
          variant="outline"
        />
      ),
      loader: (): null => null,
      path: '/',
    },
  ]);
};

describe('ScheduleWebhookConfirmAction Component', () => {
  test('does not post on the first click: it asks first', async () => {
    const user = userEvent.setup();
    const intents: (FormDataEntryValue | null)[] = [];
    const view = renderRotate(intents);

    await user.click(
      await view.findByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.rotateAction,
      }),
    );

    expect(
      await view.findByRole('alertdialog', {
        name: SCHEDULE_WEBHOOK_COPY.rotateTitle,
      }),
    ).toHaveTextContent(SCHEDULE_WEBHOOK_COPY.rotateDescription);
    expect(intents).toEqual([]);
  });

  test('posts the intent only when confirmed, then closes', async () => {
    const user = userEvent.setup();
    const intents: (FormDataEntryValue | null)[] = [];
    const view = renderRotate(intents);

    await user.click(
      await view.findByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.rotateAction,
      }),
    );
    await user.click(
      await view.findByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.rotateConfirm,
      }),
    );

    await waitFor(() => expect(intents).toEqual(['webhook-rotate']));
    await waitFor(() =>
      expect(view.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
  });

  test('cancelling posts nothing', async () => {
    const user = userEvent.setup();
    const intents: (FormDataEntryValue | null)[] = [];
    const view = renderRotate(intents);

    await user.click(
      await view.findByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.rotateAction,
      }),
    );
    await user.click(await view.findByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(view.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(intents).toEqual([]);
  });
});
