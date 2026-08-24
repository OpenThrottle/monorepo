import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceFolderReconciliation } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import {
  mockCheckout,
  mockDiscoveredWorktrees,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { RepositoriesSection } from '../RepositoriesSection';
import type { RepositoriesSectionProps } from '../RepositoriesSection';

const repository = mockRepository({
  checkouts: [mockCheckout({ displayName: 'openthrottle', id: 'checkout-1' })],
  id: 'repo-1',
  name: 'monorepo',
});

const rows = buildRepositoryRows([repository]);

describe('RepositoriesSection Component', () => {
  let component: RenderResult;
  let props: RepositoriesSectionProps;

  const renderSection = (): RenderResult => {
    component?.unmount();
    const RoutesStub = createRoutesStub([
      {
        Component: () => <RepositoriesSection {...props} />,
        action: () => null,
        path: '/',
      },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      autoExpandedIds: [],
      discoveredFolders: [],
      discoveredWorktrees: mockDiscoveredWorktrees(),
      isUnpopulated: true,
      limit: 10,
      page: 1,
      pickerCapabilities: {
        canUseNativeDialog: false,
        defaultBrowsePath: '/Users/dev/Development',
        roots: ['/Users/dev/Development'],
      },
      rows: [],
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      totalCount: 0,
    };

    component = renderSection();
  });

  const populate = (): void => {
    props = { ...props, isUnpopulated: false, rows, totalCount: 1 };
    component = renderSection();
  };

  test('renders the onboarding block when there are no repositories', () => {
    expect(component.getByTestId('RepositoriesSection')).toBeInTheDocument();
    expect(
      component.getByTestId('GlobalFeatureOnboarding'),
    ).toBeInTheDocument();
    expect(
      component.getByText(REPOSITORIES_ONBOARDING.tagline),
    ).toBeInTheDocument();
    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.sectionDescription),
    ).toBeInTheDocument();
  });

  test('renders the onboarding trigger in the empty state', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });

  test('renders the toolbar, table and pagination once populated', () => {
    populate();

    expect(component.queryByTestId('GlobalFeatureOnboarding')).toBeNull();
    expect(component.getByTestId('RepositoriesToolbar')).toBeInTheDocument();
    expect(component.getByTestId('RepositoriesTable')).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
  });

  test('keeps the onboarding trigger reachable once repositories exist', () => {
    populate();

    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });

  test('opens the onboarding modal from the trigger when populated', async () => {
    const user = userEvent.setup();
    populate();

    // The block is hidden while populated, so the tagline is absent until the
    // modal opens.
    expect(component.queryByText(REPOSITORIES_ONBOARDING.tagline)).toBeNull();

    await user.click(component.getByTestId('GlobalFeatureOnboardingTrigger'));

    expect(
      await component.findByText(REPOSITORIES_ONBOARDING.tagline),
    ).toBeInTheDocument();
  });

  test('shows the merged notice when a refresh merged into an existing checkout', () => {
    props = {
      ...props,
      refreshed: {
        checkoutId: 'checkout-1',
        drift: { branchMoved: false, pathMissing: false, remoteChanged: false },
        merged: true,
      },
    };
    component = renderSection();

    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.mergedNotice),
    ).toBeInTheDocument();
  });

  test('passes refresh drift through to the table row', () => {
    props = {
      ...props,
      isUnpopulated: false,
      refreshed: {
        checkoutId: 'checkout-1',
        drift: { branchMoved: false, pathMissing: true, remoteChanged: false },
        merged: false,
      },
      rows,
      totalCount: 1,
    };
    component = renderSection();

    expect(component.getByRole('alert')).toHaveTextContent(
      WORKSPACE_FOLDERS_COPY.driftPathMissing,
    );
  });

  test('shows the actionError message when present and no addedFolder', () => {
    props = { ...props, actionError: 'Could not add folder' };
    component = renderSection();

    expect(component.getByText('Could not add folder')).toBeInTheDocument();
  });

  test('renders the added-folder result instead of the actionError when both are present', () => {
    props = {
      ...props,
      actionError: 'ignored error',
      addedFolder: {
        checkout: {
          createdAt: '2026-07-24T00:00:00.000Z',
          displayName: 'openthrottle',
          filesystemPath: '/Users/dev/Development/openthrottle',
          foreignSkillInjectionEnabled: false,
          id: 'checkout-1',
          inspection: null,
          kind: 'primary',
          managed: false,
          repositoryId: 'repo-1',
          scannedAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
          userId: 'user-1',
        },
        project: null,
        projectCreated: false,
        reconciliation: WorkspaceFolderReconciliation.CreatedCanonical,
        repository,
      },
    };
    component = renderSection();

    expect(component.getByTestId('AddFolderResult')).toBeInTheDocument();
    expect(component.queryByText('ignored error')).toBeNull();
  });
});
