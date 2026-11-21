import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

import { ScheduleApproveButton } from '../ScheduleApproveButton';

const renderButton = (result: Record<string, unknown>) => {
  const intents: (FormDataEntryValue | null)[] = [];
  const view = renderWithMemoryRouter(
    [
      {
        Component: (): React.ReactElement => (
          <ScheduleApproveButton jobId="job-1" />
        ),
        path: '/',
      },
      {
        action: async ({
          request,
        }: {
          request: Request;
        }): Promise<Record<string, unknown>> => {
          intents.push((await request.formData()).get('intent'));
          return result;
        },
        element: null,
        path: '/schedule/:jobId',
      },
    ],
    { initialEntries: ['/'] },
  );

  return { intents, view };
};

describe('ScheduleApproveButton Component', () => {
  test('posts the approve intent to the job detail route', async () => {
    const user = userEvent.setup();
    const { intents, view } = renderButton({ ok: true });

    await user.click(
      view.getByRole('button', { name: SCHEDULE_APPROVAL_COPY.approveAction }),
    );

    await waitFor(() => expect(intents).toEqual(['approve']));
  });

  test('shows the server error when approval is refused', async () => {
    const user = userEvent.setup();
    const { view } = renderButton({ error: 'Not allowed.' });

    await user.click(
      view.getByRole('button', { name: SCHEDULE_APPROVAL_COPY.approveAction }),
    );

    expect(await view.findByRole('alert')).toHaveTextContent('Not allowed.');
  });
});
