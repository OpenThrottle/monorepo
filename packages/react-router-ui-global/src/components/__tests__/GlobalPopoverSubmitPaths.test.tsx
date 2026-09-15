import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { GlobalPopoverAction } from '../GlobalPopover';
import { GlobalPopover } from '../GlobalPopover';

/**
 * Both `kind: 'submit'` paths must actually reach the route action. A menu
 * action that silently sends no request is indistinguishable from one that
 * worked, which is the failure class OT plan d29174ff exists to close.
 *
 * The non-confirm path renders a real `<Form>` inside the dropdown content and
 * relies on it surviving the menu close. That was suspected to be broken by the
 * same unmount-before-submit mechanism as the old confirm path — it is not.
 * See the note on the non-confirm branch in `GlobalPopoverActionItem`.
 */
const renderWithAction = (
  action: GlobalPopoverAction,
  routeAction: () => unknown,
): ReturnType<typeof render> => {
  const Component = (): React.ReactElement => (
    <GlobalPopover actions={[action]} ariaLabel="Row actions" />
  );
  const RoutesStub = createRoutesStub([
    { Component, action: routeAction, path: '/' },
  ]);

  return render(<RoutesStub />);
};

describe('GlobalPopover submit paths reach the route action', () => {
  afterEach(() => {
    cleanup();
  });

  test('non-confirm submit action posts when selected from the menu', async () => {
    const user = userEvent.setup();
    const routeAction = vi.fn(() => ({ ok: true }));
    const component = renderWithAction(
      {
        fields: { id: 'checkout-1', intent: 'refreshCheckout' },
        id: 'refreshCheckout',
        kind: 'submit',
        label: 'Refresh',
      },
      routeAction,
    );

    await user.click(component.getByRole('button', { name: 'Row actions' }));
    await user.click(component.getByRole('menuitem', { name: 'Refresh' }));

    await waitFor(() => {
      expect(routeAction).toHaveBeenCalledTimes(1);
    });
  });

  test('confirm submit action posts only after the dialog is confirmed', async () => {
    const user = userEvent.setup();
    const routeAction = vi.fn(() => ({ ok: true }));
    const component = renderWithAction(
      {
        confirm: { description: 'Removes it.', title: 'Remove?' },
        fields: { id: 'checkout-1', intent: 'removeCheckout' },
        id: 'removeCheckout',
        kind: 'submit',
        label: 'Remove',
      },
      routeAction,
    );

    await user.click(component.getByRole('button', { name: 'Row actions' }));
    await user.click(component.getByRole('menuitem', { name: 'Remove' }));

    // The gate is real: selecting the item must not submit on its own.
    expect(routeAction).not.toHaveBeenCalled();

    await user.click(
      component.getByTestId('GlobalPopoverConfirmDialogConfirm'),
    );

    await waitFor(() => {
      expect(routeAction).toHaveBeenCalledTimes(1);
    });
  });
});
