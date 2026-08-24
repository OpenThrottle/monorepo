import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  RolloutFlagKind,
  type RolloutFlagFieldsFragment,
} from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagsTableRowActions } from '../RolloutFlagsTableRowActions';
import type { RolloutFlagsTableRowActionsProps } from '../RolloutFlagsTableRowActions';

const flag: RolloutFlagFieldsFragment = {
  createdAt: '2026-07-24T00:00:00.000Z',
  description: null,
  enabled: true,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: RolloutFlagKind.Boolean,
  offVariation: 0,
  targetRoles: [],
  updatedAt: '2026-07-24T00:00:00.000Z',
  variations: [
    { description: null, name: null, valueJson: 'false' },
    { description: null, name: null, valueJson: 'true' },
  ],
};

const menuLabel = `${ROLLOUT_COPY.menuAriaLabelPrefix} ${flag.key}`;

describe('RolloutFlagsTableRowActions Component', () => {
  let component: RenderResult;
  let props: RolloutFlagsTableRowActionsProps;
  let submitted: FormData[];

  const renderActions = (): RenderResult => {
    component?.unmount();
    const Component = (): React.ReactElement => (
      <RolloutFlagsTableRowActions {...props} />
    );
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          submitted.push(await request.formData());
          return null;
        },
        path: '/',
      },
    ]);

    return render(<RoutesStub />);
  };

  const openMenu = async (
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> => {
    await user.click(component.getByRole('button', { name: menuLabel }));
  };

  beforeEach(() => {
    props = { flag };
    submitted = [];
    component = renderActions();
  });

  test('renders a single actions trigger naming the flag key', () => {
    expect(
      component.getByTestId('RolloutFlagsTableRowActions-flag-1'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: menuLabel }),
    ).toBeInTheDocument();
  });

  test('exposes Edit as a link to the flag edit route', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    expect(
      component.getByRole('menuitem', { name: ROLLOUT_COPY.editButton }),
    ).toHaveAttribute('href', '/settings/rollout/flag-1/edit');
  });

  test('opens confirm and submits deleteRolloutFlag only after confirming', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', { name: ROLLOUT_COPY.deleteButton }),
    );

    expect(
      component.getByRole('alertdialog', {
        name: ROLLOUT_COPY.deleteConfirmTitle,
      }),
    ).toBeInTheDocument();
    expect(component.getByText(flag.key)).toBeInTheDocument();
    expect(submitted).toHaveLength(0);

    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.deleteButton }),
    );

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    expect(submitted[0]?.get('intent')).toBe('deleteRolloutFlag');
    expect(submitted[0]?.get('id')).toBe('flag-1');
  });

  test('does not submit when the confirm dialog is cancelled', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', { name: ROLLOUT_COPY.deleteButton }),
    );
    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.cancelButton }),
    );

    expect(submitted).toHaveLength(0);
  });
});
