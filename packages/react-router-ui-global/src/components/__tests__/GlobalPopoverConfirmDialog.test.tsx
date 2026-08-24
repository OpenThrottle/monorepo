import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GLOBAL_POPOVER_COPY } from '../../data/data.copy';
import { GlobalPopoverConfirmDialog } from '../GlobalPopoverConfirmDialog';

describe('GlobalPopoverConfirmDialog Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders title, description, and default action labels', () => {
    const Component = (): React.ReactElement => (
      <GlobalPopoverConfirmDialog
        description="Really delete?"
        fields={{ id: '1', intent: 'delete' }}
        onOpenChange={vi.fn()}
        open={true}
        title="Delete item"
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('alertdialog', { name: 'Delete item' }),
    ).toBeInTheDocument();
    expect(component.getByText('Really delete?')).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: GLOBAL_POPOVER_COPY.cancelLabel,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: GLOBAL_POPOVER_COPY.confirmLabel,
      }),
    ).toBeInTheDocument();
  });

  test('posts hidden fields when confirmed', async () => {
    const user = userEvent.setup();
    const state: { submitted: FormData | null } = { submitted: null };

    // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper
    const Component = (): React.ReactElement => (
      <GlobalPopoverConfirmDialog
        confirmLabel="Yes, delete"
        description="Gone forever"
        fields={{ id: 'row-9', intent: 'deleteRepo' }}
        onOpenChange={vi.fn()}
        open={true}
        title="Delete"
      />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          state.submitted = await request.formData();
          return null;
        },
        path: '/',
      },
    ]);
    const component = render(<RoutesStub />);

    await user.click(component.getByRole('button', { name: 'Yes, delete' }));

    expect(state.submitted?.get('intent')).toBe('deleteRepo');
    expect(state.submitted?.get('id')).toBe('row-9');
  });
});
