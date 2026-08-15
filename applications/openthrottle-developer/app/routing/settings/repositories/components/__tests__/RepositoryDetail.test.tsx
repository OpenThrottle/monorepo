import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RepositoryDetail } from '../RepositoryDetail';
import type { RepositoryDetailProps } from '../RepositoryDetail';

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

describe('RepositoryDetail Component', () => {
  let component: RenderResult;
  let props: RepositoryDetailProps;

  const setup = (): void => {
    const Component = () => <RepositoryDetail {...props} />;
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

    expect(component.getByTestId('RepositoryDetail')).toBeInTheDocument();
    expect(
      component.getAllByText('https://github.com/acme/monorepo').length,
    ).toBeGreaterThan(0);
    expect(component.getByText('Platform')).toBeInTheDocument();
    expect(component.getByText('feature/onboarding')).toBeInTheDocument();
    expect(
      component.getByText('/Users/dev/Development/openthrottle'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('RepositoryDetailCheckout-checkout-1'),
    ).toBeInTheDocument();
  });

  test('renders the detected Stack and Agent config badges per checkout', () => {
    setup();

    expect(component.getByText('Stack')).toBeInTheDocument();
    expect(component.getByText('Agent config')).toBeInTheDocument();
    // Stack: nxWorkspace + pnpmWorkspace + packageManager + languages.
    expect(component.getByText('Nx')).toBeInTheDocument();
    expect(component.getByText('pnpm workspace')).toBeInTheDocument();
    // Agent config: mcpJson + claudeMd + cursorRules + skillsDir (agentsMd off).
    expect(component.getByText('.mcp.json')).toBeInTheDocument();
    expect(component.getByText('.cursor/rules')).toBeInTheDocument();
    expect(component.queryByText('AGENTS.md')).not.toBeInTheDocument();
  });

  test('omits the badge rows for a checkout with no inspection', () => {
    props.repository = {
      ...props.repository,
      checkouts: [{ ...checkout, inspection: null }],
    };
    setup();

    expect(component.queryByText('Stack')).not.toBeInTheDocument();
    expect(component.queryByText('Agent config')).not.toBeInTheDocument();
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
