import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { AgentsSkillsRegistry } from '~/routing/agents/components/AgentsSkillsRegistry';
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

const SAMPLE_ENTRIES: readonly RepoSkillEntry[] = [
  {
    disableModelInvocation: undefined,
    layout: 'agents',
    repoRelativePath: '.agents/skills/unique-alpha/SKILL.md',
    slug: 'unique-alpha',
    summary: 'Alpha summary for registry tests.',
    tags: undefined,
  },
  {
    disableModelInvocation: undefined,
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/unique-beta/SKILL.md',
    slug: 'unique-beta',
    summary: 'Beta summary only in cursor tree.',
    tags: undefined,
  },
];

describe('AgentsSkillsRegistry', () => {
  test('renders zero counts and empty section copy when there are no entries', () => {
    const RoutesStub = createRoutesStub([
      {
        Component: () => <AgentsSkillsRegistry entries={[]} />,
        path: '/',
      },
    ]);

    render(<RoutesStub />);

    expect(screen.getByText(/0 skills under/i)).toBeInTheDocument();
    expect(screen.getByText(/0 under/i)).toBeInTheDocument();

    const emptyMessages = screen.getAllByText(
      /No matching entries in this section/i,
    );
    expect(emptyMessages).toHaveLength(2);
  });

  test('renders layout counts and entry slugs for provided entries', () => {
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
        Component: () => <AgentsSkillsRegistry entries={SAMPLE_ENTRIES} />,
        path: '/',
      },
    ]);

    render(<RoutesStub />);

    expect(screen.getByText(/1 skills under/i)).toBeInTheDocument();
    expect(screen.getByText(/1 under/i)).toBeInTheDocument();
    expect(screen.getByText('unique-alpha')).toBeInTheDocument();
    expect(screen.getByText('unique-beta')).toBeInTheDocument();
  });

  test('filters entries by slug, path, or summary (case-insensitive)', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
        Component: () => <AgentsSkillsRegistry entries={SAMPLE_ENTRIES} />,
        path: '/',
      },
    ]);

    render(<RoutesStub />);

    const filter = screen.getByRole('searchbox', {
      name: /Filter by slug, path, or summary/i,
    });

    await user.type(filter, 'UNIQUE-BETA');

    expect(screen.queryByText('unique-alpha')).not.toBeInTheDocument();
    expect(screen.getByText('unique-beta')).toBeInTheDocument();
  });

  test('GitHub links point at main-branch blob URLs for repo-relative paths', () => {
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
        Component: () => <AgentsSkillsRegistry entries={SAMPLE_ENTRIES} />,
        path: '/',
      },
    ]);

    render(<RoutesStub />);

    const githubLinks = screen.getAllByRole('link', {
      name: /View on GitHub/i,
    });
    expect(githubLinks).toHaveLength(2);

    expect(githubLinks[0]).toHaveAttribute(
      'href',
      githubOpenThrottleMainBlob(SAMPLE_ENTRIES[0].repoRelativePath),
    );
    expect(githubLinks[1]).toHaveAttribute(
      'href',
      githubOpenThrottleMainBlob(SAMPLE_ENTRIES[1].repoRelativePath),
    );
  });

  test('renders Copy path controls for each visible skill row', () => {
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
        Component: () => <AgentsSkillsRegistry entries={SAMPLE_ENTRIES} />,
        path: '/',
      },
    ]);

    render(<RoutesStub />);

    const copyButtons = screen.getAllByRole('button', { name: /^Copy path$/i });
    expect(copyButtons).toHaveLength(2);
  });
});
