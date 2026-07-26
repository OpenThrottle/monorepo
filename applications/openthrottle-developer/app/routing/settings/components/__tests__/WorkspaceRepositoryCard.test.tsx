import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceRepositoryCard } from '../WorkspaceRepositoryCard';
import type { WorkspaceRepositoryCardProps } from '../WorkspaceRepositoryCard';

const checkout = {
  createdAt: '2026-07-24T00:00:00.000Z',
  displayName: 'openthrottle',
  filesystemPath: '/Users/dev/Development/openthrottle',
  id: 'checkout-1',
  inspection: {
    agentConfig: {
      agentsMd: false,
      claudeMd: true,
      cursorRules: true,
      mcpJson: true,
      skillsDir: true,
    },
    git: {
      currentBranch: 'feature/onboarding',
      defaultBranch: 'main',
      dirty: true,
      isRepo: true,
      linkedWorktrees: [],
      normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
    },
    scannedAt: '2026-07-24T00:00:00.000Z',
    stack: {
      languages: ['typescript'],
      nxWorkspace: true,
      packageManager: 'pnpm',
      pnpmWorkspace: true,
      turbo: false,
    },
    warnings: [],
  },
  kind: 'primary',
  managed: true,
  repositoryId: 'repo-1',
  scannedAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
  userId: 'user-1',
};

describe('WorkspaceRepositoryCard Component', () => {
  let component: RenderResult;
  let props: WorkspaceRepositoryCardProps;

  const setup = (): void => {
    const Component = () => <WorkspaceRepositoryCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      projects: [{ id: 'project-1', name: 'monorepo' }],
      repository: {
        checkouts: [checkout],
        createdAt: '2026-07-24T00:00:00.000Z',
        defaultBranch: 'main',
        id: 'repo-1',
        name: 'monorepo',
        normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
        project: { id: 'project-1', name: 'monorepo' },
        projectId: 'project-1',
        updatedAt: '2026-07-24T00:00:00.000Z',
      },
    };
  });

  test('renders the repository with its checkout, branch, and managed badge', () => {
    setup();

    expect(
      component.getByTestId('WorkspaceRepositoryCard'),
    ).toBeInTheDocument();
    expect(
      component.getByText('https://github.com/OpenThrottle/monorepo'),
    ).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
    expect(component.getByText('feature/onboarding')).toBeInTheDocument();
    expect(component.getByText('Managed')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /Refresh/ }),
    ).toBeInTheDocument();
  });

  test('surfaces drift warnings after a refresh', () => {
    props.driftByCheckoutId = {
      'checkout-1': {
        branchMoved: true,
        pathMissing: true,
        remoteChanged: false,
      },
    };
    setup();

    expect(
      component.getByText('Folder is missing on disk'),
    ).toBeInTheDocument();
    expect(
      component.getByText('Branch changed since last scan'),
    ).toBeInTheDocument();
  });
});
