import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceFolderReconciliation } from '~/__generated__/graphql';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { SettingsWorkspaceRepositoriesSection } from './SettingsWorkspaceRepositoriesSection';
import type { SettingsWorkspaceRepositoriesSectionProps } from './SettingsWorkspaceRepositoriesSection';

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

describe('SettingsWorkspaceRepositoriesSection Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceRepositoriesSectionProps;

  const renderSection = (): RenderResult => {
    component?.unmount();
    const RoutesStub = createRoutesStub([
      {
        Component: () => <SettingsWorkspaceRepositoriesSection {...props} />,
        action: () => null,
        path: '/',
      },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      discoveredFolders: [],
      repositories: [],
    };

    component = renderSection();
  });

  test('renders the empty state when there are no repositories', () => {
    expect(
      component.getByTestId('SettingsWorkspaceRepositoriesSection'),
    ).toBeInTheDocument();
    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.repositoriesEmpty),
    ).toBeInTheDocument();
    expect(
      component.getByText(WORKSPACE_FOLDERS_COPY.sectionDescription),
    ).toBeInTheDocument();
  });

  test('renders a list item per repository when repositories are provided', () => {
    props = { ...props, repositories: [repository] };
    component = renderSection();

    expect(
      component.queryByText(WORKSPACE_FOLDERS_COPY.repositoriesEmpty),
    ).toBeNull();
    expect(component.getByText('monorepo')).toBeInTheDocument();
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

    expect(
      component.getByTestId('WorkspaceAddFolderResult'),
    ).toBeInTheDocument();
    expect(component.queryByText('ignored error')).toBeNull();
  });
});
