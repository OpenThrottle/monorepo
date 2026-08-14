import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceRepositoryDetail } from '../WorkspaceRepositoryDetail';
import type { WorkspaceRepositoryDetailProps } from '../WorkspaceRepositoryDetail';

const checkout = {
  createdAt: '2026-07-24T00:00:00.000Z',
  displayName: 'openthrottle',
  filesystemPath: '/Users/dev/Development/openthrottle',
  foreignSkillInjectionEnabled: false,
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
      normalizedRemoteUrl: 'https://github.com/acme/monorepo',
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

describe('WorkspaceRepositoryDetail Component', () => {
  let component: RenderResult;
  let props: WorkspaceRepositoryDetailProps;

  const setup = (): void => {
    const Component = () => <WorkspaceRepositoryDetail {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { path: '/edit' },
    ]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      editTo: '/edit',
      repository: {
        checkouts: [checkout],
        createdAt: '2026-07-24T00:00:00.000Z',
        defaultBranch: 'main',
        id: 'repo-1',
        name: 'acme/monorepo',
        normalizedRemoteUrl: 'https://github.com/acme/monorepo',
        project: { id: 'project-1', name: 'Platform' },
        projectId: 'project-1',
        updatedAt: '2026-07-24T00:00:00.000Z',
      },
    };
  });

  test('renders the repository name, remote, branch, project, and checkout row', () => {
    setup();

    expect(
      component.getByTestId('WorkspaceRepositoryDetail'),
    ).toBeInTheDocument();
    expect(
      component.getAllByText('https://github.com/acme/monorepo').length,
    ).toBeGreaterThan(0);
    expect(component.getByText('Platform')).toBeInTheDocument();
    expect(component.getByText('feature/onboarding')).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('WorkspaceRepositoryDetailCheckout-checkout-1'),
    ).toBeInTheDocument();
  });

  test('shows skill injection Off by default', () => {
    setup();

    expect(component.getByText('Skill injection')).toBeInTheDocument();
    expect(component.getByText('Off')).toBeInTheDocument();
  });

  test('shows skill injection On when a checkout is opted in', () => {
    props.repository = {
      ...props.repository,
      checkouts: [{ ...checkout, foreignSkillInjectionEnabled: true }],
    };
    setup();

    expect(component.getByText('On')).toBeInTheDocument();
  });

  test('falls back to the no-project label when unlinked', () => {
    props.repository = {
      ...props.repository,
      project: null,
      projectId: null,
    };
    setup();

    expect(component.getByText('No project linked')).toBeInTheDocument();
  });

  test('exposes an Edit link to the edit route', async () => {
    const user = userEvent.setup();
    setup();

    const editLink = component.getByRole('link', { name: /Edit/ });
    expect(editLink).toHaveAttribute('href', '/edit');

    await user.click(editLink);
  });
});
