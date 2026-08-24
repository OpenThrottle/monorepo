import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GLOBAL_POPOVER_COPY } from '../../data/data.copy';
import { GlobalPopover } from '../GlobalPopover';
import type { GlobalPopoverAction, GlobalPopoverProps } from '../GlobalPopover';

const openMenu = async (
  component: RenderResult,
  ariaLabel = 'Row actions',
): Promise<void> => {
  const user = userEvent.setup();
  await user.click(component.getByRole('button', { name: ariaLabel }));
};

const DetailRoute = (): React.ReactElement => <div>Detail</div>;

const renderPopover = (
  props: Partial<GlobalPopoverProps> & {
    readonly actions: readonly GlobalPopoverAction[];
  },
): RenderResult => {
  const merged: GlobalPopoverProps = {
    ariaLabel: 'Row actions',
    ...props,
  };

  // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper
  const Component = (): React.ReactElement => <GlobalPopover {...merged} />;
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: () => null,
      path: '/',
    },
    {
      Component: DetailRoute,
      path: '/detail',
    },
  ]);

  return render(<RoutesStub />);
};

describe('GlobalPopover Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('opens the menu from the default trigger', async () => {
    const component = renderPopover({
      actions: [
        {
          id: 'select-1',
          kind: 'select',
          label: 'Do thing',
          onSelect: vi.fn(),
        },
      ],
    });

    expect(
      component.queryByRole('menuitem', { name: 'Do thing' }),
    ).not.toBeInTheDocument();

    await openMenu(component);

    expect(
      component.getByRole('menuitem', { name: 'Do thing' }),
    ).toBeInTheDocument();
  });

  test('fires a select action', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const component = renderPopover({
      actions: [
        {
          id: 'select-1',
          kind: 'select',
          label: 'Pause',
          onSelect,
        },
      ],
    });

    await openMenu(component);
    await user.click(component.getByRole('menuitem', { name: 'Pause' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('renders a link action that navigates', async () => {
    const user = userEvent.setup();
    const component = renderPopover({
      actions: [
        {
          id: 'link-1',
          kind: 'link',
          label: 'View',
          to: '/detail',
        },
      ],
    });

    await openMenu(component);
    await user.click(component.getByRole('menuitem', { name: 'View' }));

    expect(component.getByText('Detail')).toBeInTheDocument();
  });

  test('renders a submit action with hidden fields', async () => {
    const user = userEvent.setup();
    const component = renderPopover({
      actions: [
        {
          fields: { id: 'row-1', intent: 'refresh' },
          id: 'submit-1',
          kind: 'submit',
          label: 'Refresh',
        },
      ],
    });

    await openMenu(component);

    const item = component.getByRole('menuitem', { name: 'Refresh' });
    expect(item).toBeInTheDocument();

    const form = item.closest('form');
    expect(form).not.toBeNull();
    expect(form?.querySelector('input[name="intent"]')).toHaveValue('refresh');
    expect(form?.querySelector('input[name="id"]')).toHaveValue('row-1');

    await user.click(item);
  });

  test('shows pendingLabel and blocks activation while pending', async () => {
    const user = userEvent.setup();
    const component = renderPopover({
      actions: [
        {
          fields: { intent: 'refresh' },
          id: 'submit-pending',
          kind: 'submit',
          label: 'Refresh',
          pending: true,
          pendingLabel: 'Refreshing…',
        },
      ],
    });

    await openMenu(component);

    const item = component.getByRole('menuitem', { name: 'Refreshing…' });
    expect(item).toHaveAttribute('data-disabled');
    await user.click(item);
    expect(
      component.getByRole('menuitem', { name: 'Refreshing…' }),
    ).toBeInTheDocument();
  });

  test('blocks activation when disabled', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const component = renderPopover({
      actions: [
        {
          disabled: true,
          id: 'select-disabled',
          kind: 'select',
          label: 'Nope',
          onSelect,
        },
      ],
    });

    await openMenu(component);
    await user.click(component.getByRole('menuitem', { name: 'Nope' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  test('renders a separator when separatorBefore is set', async () => {
    const component = renderPopover({
      actions: [
        {
          id: 'select-1',
          kind: 'select',
          label: 'Safe',
          onSelect: vi.fn(),
        },
        {
          id: 'select-2',
          kind: 'select',
          label: 'Danger',
          onSelect: vi.fn(),
          separatorBefore: true,
        },
      ],
    });

    await openMenu(component);

    expect(component.getByRole('separator')).toBeInTheDocument();
  });

  test('opens confirm and only submits after confirming', async () => {
    const user = userEvent.setup();
    const state: { submitted: FormData | null } = { submitted: null };

    // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper
    const Component = (): React.ReactElement => (
      <GlobalPopover
        actions={[
          {
            confirm: {
              confirmLabel: 'Remove now',
              description: (
                <>
                  Remove <span className="font-medium">acme</span>?
                </>
              ),
              title: 'Remove checkout',
            },
            destructive: true,
            fields: { id: 'row-1', intent: 'deleteRepo' },
            id: 'delete',
            kind: 'submit',
            label: 'Remove',
          },
        ]}
        ariaLabel="Row actions"
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

    await openMenu(component);
    await user.click(component.getByRole('menuitem', { name: 'Remove' }));

    expect(
      component.getByRole('alertdialog', { name: 'Remove checkout' }),
    ).toBeInTheDocument();
    expect(state.submitted).toBeNull();

    await user.click(component.getByRole('button', { name: 'Remove now' }));

    expect(state.submitted).not.toBeNull();
    expect(state.submitted?.get('intent')).toBe('deleteRepo');
    expect(state.submitted?.get('id')).toBe('row-1');
  });

  test('does not submit when confirm is cancelled', async () => {
    const user = userEvent.setup();
    const state = { submitted: false };

    // eslint-disable-next-line react/no-multi-comp -- test-local route wrapper
    const Component = (): React.ReactElement => (
      <GlobalPopover
        actions={[
          {
            confirm: {
              description: 'Really?',
              title: 'Confirm',
            },
            fields: { intent: 'deleteRepo' },
            id: 'delete',
            kind: 'submit',
            label: 'Remove',
          },
        ]}
        ariaLabel="Row actions"
      />
    );

    const RoutesStub = createRoutesStub([
      {
        Component,
        action: () => {
          state.submitted = true;
          return null;
        },
        path: '/',
      },
    ]);
    const component = render(<RoutesStub />);

    await openMenu(component);
    await user.click(component.getByRole('menuitem', { name: 'Remove' }));
    await user.click(
      component.getByRole('button', {
        name: GLOBAL_POPOVER_COPY.cancelLabel,
      }),
    );

    expect(state.submitted).toBe(false);
    expect(component.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
