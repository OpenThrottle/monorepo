import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import {
  REPOSITORIES_ONBOARDING,
  REPOSITORIES_TABLE_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { RepositoriesTable } from '../RepositoriesTable';
import type { RepositoriesTableProps } from '../RepositoriesTable';

const rows = buildRepositoryRows([
  mockRepository({
    checkouts: [
      mockCheckout({
        branch: 'main',
        displayName: 'openthrottle',
        filesystemPath: '/Users/dev/Development/openthrottle',
        id: 'primary-1',
        managed: true,
      }),
      mockCheckout({
        branch: 'loop-plan',
        displayName: 'openthrottle-worktree',
        id: 'worktree-1',
        kind: 'worktree',
      }),
    ],
    id: 'repo-1',
    name: 'monorepo',
  }),
  mockRepository({
    checkouts: [mockCheckout({ displayName: 'website', id: 'primary-2' })],
    id: 'repo-2',
    name: 'website',
  }),
]);

describe('RepositoriesTable Component', () => {
  let component: RenderResult;
  let props: RepositoriesTableProps;

  const renderTable = (): RenderResult => {
    component?.unmount();
    const Component = () => <RepositoriesTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      autoExpandedIds: [],
      isUnpopulated: false,
      rows,
    };

    component = renderTable();
  });

  test('renders one parent row per primary checkout, children collapsed', () => {
    expect(component.getByTestId('RepositoriesTable')).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
    expect(component.getByText('openthrottle')).toBeInTheDocument();
    expect(component.getAllByText('website').length).toBeGreaterThan(0);
    expect(component.queryByText('openthrottle-worktree')).toBeNull();
  });

  test('renders the path, branch and managed badges', () => {
    expect(
      component.getByTitle('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
    expect(component.getAllByText('main').length).toBeGreaterThan(0);
    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.managedBadge),
    ).toBeInTheDocument();
  });

  test('expands and collapses a group with the chevron toggle', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: REPOSITORIES_TABLE_COPY.expandGroup,
      }),
    );

    expect(component.getByText('openthrottle-worktree')).toBeInTheDocument();
    expect(
      component.getByText(REPOSITORIES_TABLE_COPY.worktreeBadge),
    ).toBeInTheDocument();

    await user.click(
      component.getByRole('button', {
        name: REPOSITORIES_TABLE_COPY.collapseGroup,
      }),
    );

    expect(component.queryByText('openthrottle-worktree')).toBeNull();
  });

  test('offers no toggle for a repository without worktrees', () => {
    expect(
      component.getAllByRole('button', {
        name: REPOSITORIES_TABLE_COPY.expandGroup,
      }),
    ).toHaveLength(1);
  });

  test('opens the groups named by autoExpandedIds', () => {
    props = { ...props, autoExpandedIds: ['primary-1'] };
    component = renderTable();

    expect(component.getByText('openthrottle-worktree')).toBeInTheDocument();
  });

  test('surfaces drift warnings on the affected row as an alert', () => {
    props = {
      ...props,
      driftByCheckoutId: {
        'primary-1': {
          branchMoved: true,
          pathMissing: false,
          remoteChanged: false,
        },
      },
    };
    component = renderTable();

    expect(component.getByRole('alert')).toHaveTextContent(
      WORKSPACE_FOLDERS_COPY.driftBranchMoved,
    );
  });

  test('shows the onboarding block when the workspace has no repositories', () => {
    props = { ...props, isUnpopulated: true, rows: [] };
    component = renderTable();

    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(
      component.getByText(REPOSITORIES_ONBOARDING.tagline),
    ).toBeInTheDocument();
  });

  test('shows the no-results state, not onboarding, when a search matched nothing', () => {
    props = { ...props, isUnpopulated: false, rows: [] };
    component = renderTable();

    expect(component.queryByTestId('GlobalFeatureOnboarding')).toBeNull();
    expect(
      component.getByText(REPOSITORIES_TABLE_COPY.noResults),
    ).toBeInTheDocument();
  });

  test('renders a row actions slot per row', () => {
    expect(
      component.getByTestId('RepositoryRowActions-primary-1'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('RepositoryRowActions-primary-2'),
    ).toBeInTheDocument();
  });
});
