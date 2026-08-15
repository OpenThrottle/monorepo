import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceFolderReconciliation } from '~/__generated__/graphql';
import { AddFolderResult } from '../AddFolderResult';
import type { AddFolderResultProps } from '../AddFolderResult';

const checkout = {
  createdAt: '2026-07-24T00:00:00.000Z',
  displayName: 'openthrottle',
  filesystemPath: '/Users/dev/Development/openthrottle',
  foreignSkillInjectionEnabled: false,
  id: 'checkout-1',
  inspection: {
    agentConfig: {
      agentsMd: true,
      claudeMd: true,
      cursorRules: false,
      mcpJson: true,
      skillsDir: false,
    },
    git: {
      currentBranch: 'main',
      defaultBranch: 'main',
      dirty: false,
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
  managed: false,
  repositoryId: 'repo-1',
  scannedAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
  userId: 'user-1',
};

const repository = {
  checkouts: [checkout],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
  project: { id: 'project-1', name: 'monorepo' },
  projectId: 'project-1',
  updatedAt: '2026-07-24T00:00:00.000Z',
};

describe('AddFolderResult Component', () => {
  let component: RenderResult;
  let props: AddFolderResultProps;

  beforeEach(() => {
    props = {
      payload: {
        checkout,
        project: { id: 'project-1', name: 'monorepo' },
        projectCreated: true,
        reconciliation: WorkspaceFolderReconciliation.CreatedCanonical,
        repository,
      },
    };

    const Component = () => <AddFolderResult {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('shows detected git metadata without manual fields', () => {
    expect(component.getByTestId('AddFolderResult')).toBeInTheDocument();
    expect(
      component.getByText('https://github.com/OpenThrottle/monorepo'),
    ).toBeInTheDocument();
    expect(component.getByText('main')).toBeInTheDocument();
    expect(component.getByText('Nx')).toBeInTheDocument();
    expect(component.getByText('pnpm')).toBeInTheDocument();
    expect(component.getByText('CLAUDE.md')).toBeInTheDocument();
  });

  test('shows the auto-created project link', () => {
    expect(component.getByText(/Linked to project/)).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
    expect(component.getByText(/\(created\)/)).toBeInTheDocument();
  });

  test('offers the editor configuration apply for the new checkout', () => {
    expect(
      component.getByRole('button', { name: 'Apply editor configuration' }),
    ).toBeInTheDocument();
  });
});
