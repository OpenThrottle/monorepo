import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { REPOSITORIES_ROW_ACTIONS_COPY } from '~/routing/settings/repositories/data/data.copy';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { RepositoryRowActions } from '../RepositoryRowActions';
import type { RepositoryRowActionsProps } from '../RepositoryRowActions';

const [row] = buildRepositoryRows([
  mockRepository({
    checkouts: [mockCheckout({ displayName: 'openthrottle', id: 'primary-1' })],
    id: 'repo-1',
    name: 'monorepo',
  }),
]);

const menuLabel = `${REPOSITORIES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} openthrottle`;

describe('RepositoryRowActions Component', () => {
  let component: RenderResult;
  let props: RepositoryRowActionsProps;
  let submitted: FormData[];
  /** Resolved before the stub action returns; a pending promise keeps a submission in flight. */
  let actionGate: Promise<void>;

  const renderActions = (): RenderResult => {
    component?.unmount();
    const Component = () => <RepositoryRowActions {...props} />;
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }) => {
          submitted.push(await request.formData());
          await actionGate;

          return null;
        },
        path: '/',
      },
    ]);

    return render(<RoutesStub />);
  };

  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(component.getByRole('button', { name: menuLabel }));
  };

  beforeEach(() => {
    props = { row };
    submitted = [];
    actionGate = Promise.resolve();

    component = renderActions();
  });

  test('renders a single actions trigger naming the checkout', () => {
    expect(
      component.getByTestId('RepositoryRowActions-primary-1'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: menuLabel }),
    ).toBeInTheDocument();
  });

  test('submits the refreshCheckout intent with the checkout id', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', {
        name: WORKSPACE_FOLDERS_COPY.refreshButton,
      }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].get('intent')).toBe('refreshCheckout');
    expect(submitted[0].get('id')).toBe('primary-1');
  });

  test('submits applyEditorConfig with the checkout id under repositoryId', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', {
        name: WORKSPACE_FOLDERS_COPY.applyEditorConfigButton,
      }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].get('intent')).toBe('applyEditorConfig');
    expect(submitted[0].get('repositoryId')).toBe('primary-1');
  });

  test('asks for confirmation before removing, then submits deleteRepo', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', {
        name: WORKSPACE_FOLDERS_COPY.removeButton,
      }),
    );

    expect(
      await component.findByText(REPOSITORIES_ROW_ACTIONS_COPY.removeTitle),
    ).toBeInTheDocument();
    expect(submitted).toHaveLength(0);

    await user.click(
      component.getByRole('button', {
        name: REPOSITORIES_ROW_ACTIONS_COPY.removeConfirmButton,
      }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].get('intent')).toBe('deleteRepo');
    expect(submitted[0].get('id')).toBe('primary-1');
  });

  test('cancelling the confirmation submits nothing', async () => {
    const user = userEvent.setup();
    await openMenu(user);

    await user.click(
      component.getByRole('menuitem', {
        name: WORKSPACE_FOLDERS_COPY.removeButton,
      }),
    );
    await user.click(
      await component.findByRole('button', {
        name: REPOSITORIES_ROW_ACTIONS_COPY.cancelButton,
      }),
    );

    expect(submitted).toHaveLength(0);
  });

  test('disables refresh while that checkout is refreshing', async () => {
    const user = userEvent.setup();
    let releaseAction: () => void = () => undefined;
    actionGate = new Promise<void>((resolve) => {
      releaseAction = resolve;
    });

    component = renderActions();

    await openMenu(user);
    await user.click(
      component.getByRole('menuitem', {
        name: WORKSPACE_FOLDERS_COPY.refreshButton,
      }),
    );
    await openMenu(user);

    expect(
      await component.findByRole('menuitem', {
        name: REPOSITORIES_ROW_ACTIONS_COPY.refreshingLabel,
      }),
    ).toBeDisabled();

    releaseAction();
  });
});
