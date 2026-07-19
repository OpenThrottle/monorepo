import * as React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { PromoteTaskButton } from '../PromoteTaskButton';
import { renderRouteHarness } from '~/testing/route-fixtures';

const renderButton = (
  isPromoted: boolean,
): { submitted: (FormDataEntryValue | null)[] } => {
  const submitted: (FormDataEntryValue | null)[] = [];

  renderRouteHarness([
    {
      Component: (): React.ReactElement => (
        <PromoteTaskButton isPromoted={isPromoted} />
      ),
      action: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        submitted.push(formData.get('intent'));
        return {
          promoteTask: { error: null, jobId: 'job-1', success: true },
        };
      },
      path: '/',
    },
  ]);

  return { submitted };
};

describe('PromoteTaskButton', () => {
  test('does not submit until the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    const { submitted } = renderButton(false);

    // Opening the dialog does not submit.
    await user.click(screen.getByRole('button', { name: /promote to plan/i }));
    expect(
      await screen.findByText('Promote task to a plan?'),
    ).toBeInTheDocument();
    expect(submitted).toHaveLength(0);

    // Confirming submits the promoteTask intent.
    const dialog = screen.getByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: /^promote$/i }),
    );
    await waitFor(() => expect(submitted).toEqual(['promoteTask']));
  });

  test('renders a disabled control that cannot open the dialog when already promoted', async () => {
    const user = userEvent.setup();
    const { submitted } = renderButton(true);

    const button = screen.getByRole('button', { name: /promote to plan/i });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(
      screen.queryByText('Promote task to a plan?'),
    ).not.toBeInTheDocument();
    expect(submitted).toHaveLength(0);
  });
});
