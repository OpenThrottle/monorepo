import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceFolderReconciliation } from '~/__generated__/graphql';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import { RepositoriesSection } from '../RepositoriesSection';
import type { RepositoriesSectionProps } from '../RepositoriesSection';

const repository: WorkspaceRepositoryFieldsFragment = {
  checkouts: [],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
  projectId: 'project-1',
  updatedAt: '2026-07-24T00:00:00.000Z',
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
      pickerCapabilities: {
        canUseNativeDialog: false,
        defaultBrowsePath: '/Users/dev/Development',
        roots: ['/Users/dev/Development'],
      },
      repositories: [],
    };

    component = renderSection();
  });

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

  test('renders a list item per repository when repositories are provided', () => {
    props = { ...props, repositories: [repository] };
    component = renderSection();

    expect(component.queryByTestId('GlobalFeatureOnboarding')).toBeNull();
    expect(component.getByText('monorepo')).toBeInTheDocument();
  });

  test('keeps the onboarding trigger reachable once repositories exist', () => {
    props = { ...props, repositories: [repository] };
    component = renderSection();

    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });

  test('opens the onboarding modal from the trigger when populated', async () => {
    const user = userEvent.setup();
    props = { ...props, repositories: [repository] };
    component = renderSection();

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
