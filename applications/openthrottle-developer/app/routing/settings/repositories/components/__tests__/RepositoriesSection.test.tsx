import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  PruneWorktreeCheckoutOutcome,
  WorkspaceFolderReconciliation,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import {
  REPOSITORIES_ONBOARDING,
  WORKTREE_DISCOVERY_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import {
  mockCheckout,
  mockDiscoveredWorktrees,
  mockMissingCheckout,
  mockRepository,
} from '~/routing/settings/repositories/testing/mock-repositories';
import type { RepositoriesView } from '~/routing/settings/repositories/types';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';

import type { RepositoriesSectionProps } from '../RepositoriesSection';
import { RepositoriesSection } from '../RepositoriesSection';

const repository = mockRepository({
  checkouts: [mockCheckout({ displayName: 'openthrottle', id: 'checkout-1' })],
  id: 'repo-1',
  name: 'monorepo',
});

const rows = buildRepositoryRows([repository]);

const EMPTY_VIEW: RepositoriesView = {
  autoExpandedIds: [],
  isUnpopulated: true,
  limit: 10,
  page: 1,
  rows: [],
  search: '',
  showMissing: false,
  sortBy: 'name',
  sortOrder: 'asc',
  totalCount: 0,
};

const POPULATED_VIEW: RepositoriesView = {
  ...EMPTY_VIEW,
  isUnpopulated: false,
  rows,
  totalCount: 1,
};

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
      discoveredFolders: [],
      discoveredWorktrees: mockDiscoveredWorktrees(),
      discoveryStatus: 'resolved',
      pickerCapabilities: {
        canUseNativeDialog: false,
        defaultBrowsePath: '/Users/dev/Development',
        roots: ['/Users/dev/Development'],
      },
      view: EMPTY_VIEW,
    };

    component = renderSection();
  });

  const populate = (): void => {
    props = { ...props, view: POPULATED_VIEW };
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
      refreshed: {
        checkoutId: 'checkout-1',
        drift: { branchMoved: false, pathMissing: true, remoteChanged: false },
        merged: false,
      },
      view: POPULATED_VIEW,
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
          isForeign: true,
          kind: 'primary',
          managed: false,
          repositoryId: 'repo-1',
          scannedAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
          userId: 'user-1',
          worktreeSkillOverlayEnabled: true,
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

  describe('when the scan reports registered worktrees missing from disk', () => {
    test('offers the show-missing toggle and the bulk prune in the toolbar', () => {
      props = {
        ...props,
        discoveredWorktrees: mockDiscoveredWorktrees({
          missingCheckouts: [mockMissingCheckout()],
        }),
      };
      populate();

      expect(
        component.getByTestId('MissingWorktreesToggle'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('PruneMissingWorktreesButton'),
      ).toBeInTheDocument();
    });
  });

  describe('when a prune just ran', () => {
    test('reports its outcome', () => {
      props = {
        ...props,
        pruned: [
          {
            checkoutId: 'worktree-1',
            outcome: PruneWorktreeCheckoutOutcome.Pruned,
            path: '/wt/gone',
          },
        ],
      };
      populate();

      expect(component.getByTestId('PruneWorktreesOutcome')).toHaveAttribute(
        'role',
        'status',
      );
    });
  });

  describe('while the on-disk scan is still streaming in', () => {
    beforeEach(() => {
      props = {
        ...props,
        discoveredWorktrees: null,
        discoveryStatus: 'pending',
        view: POPULATED_VIEW,
      };
      component = renderSection();
    });

    test('already renders the registered repository rows', () => {
      expect(component.getByTestId('RepositoriesTable')).toBeInTheDocument();
      expect(component.getByText('monorepo')).toBeInTheDocument();
    });

    test('shows a pending line in place of the scan notice', () => {
      expect(component.getByTestId('WorktreeDiscoveryStatus')).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(
        component.getByText(WORKTREE_DISCOVERY_COPY.pendingLabel),
      ).toBeInTheDocument();
    });

    test('offers no missing-worktree controls yet', () => {
      expect(component.queryByTestId('MissingWorktreesToggle')).toBeNull();
      expect(component.queryByTestId('PruneMissingWorktreesButton')).toBeNull();
    });
  });

  describe('when the first scan failed', () => {
    test('keeps the rows and reports the failure', () => {
      props = {
        ...props,
        discoveredWorktrees: null,
        discoveryStatus: 'rejected',
        view: POPULATED_VIEW,
      };
      component = renderSection();

      expect(component.getByText('monorepo')).toBeInTheDocument();
      expect(
        component.getByText(WORKTREE_DISCOVERY_COPY.rejectedBody),
      ).toBeInTheDocument();
    });
  });
});
