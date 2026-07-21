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
    source: 'external',
    summary: 'Alpha summary for registry tests.',
    tags: undefined,
  },
  {
    disableModelInvocation: undefined,
    layout: 'agents',
    repoRelativePath: '.agents/skills/unique-beta/SKILL.md',
    slug: 'unique-beta',
    source: 'external',
    summary: 'Beta summary for registry tests.',
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

    const emptyMessages = screen.getAllByText(
      /No matching entries in this section/i,
    );
    expect(emptyMessages).toHaveLength(1);
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

    expect(screen.getByText(/2 skills under/i)).toBeInTheDocument();
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

  describe('resolved availability detail', () => {
    const RESOLVED_ENTRY: RepoSkillEntry = {
      disableModelInvocation: true,
      effectiveDisableModelInvocation: false,
      layout: 'agents',
      provenance: 'tag-allow:github@rule-1',
      repoRelativePath: '.agents/skills/git-commit/SKILL.md',
      slug: 'git-commit',
      source: 'external',
      summary: 'Commit skill re-enabled by a tag rule.',
      tags: ['git', 'github'],
    };

    test('shows static, effective, and both the raw + human provenance', () => {
      const RoutesStub = createRoutesStub([
        {
          // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
          Component: () => <AgentsSkillsRegistry entries={[RESOLVED_ENTRY]} />,
          path: '/',
        },
      ]);

      const component = render(<RoutesStub />);

      // Static (true → Manual only) and effective (false → Auto enabled) both shown.
      expect(component.getByText('Static')).toBeInTheDocument();
      expect(component.getByText('Manual only')).toBeInTheDocument();
      expect(component.getByText('Effective')).toBeInTheDocument();
      expect(component.getByText('Auto enabled')).toBeInTheDocument();
      // Raw grammar value kept visible, plus a human gloss.
      expect(
        component.getByText('tag-allow:github@rule-1'),
      ).toBeInTheDocument();
      expect(
        component.getByText(/Allowed by a tag rule \(github\)/i),
      ).toBeInTheDocument();
    });

    test('omits the effective/provenance lines when availability is unresolved', () => {
      const RoutesStub = createRoutesStub([
        {
          // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
          Component: () => <AgentsSkillsRegistry entries={SAMPLE_ENTRIES} />,
          path: '/',
        },
      ]);

      const component = render(<RoutesStub />);

      // Static row always present; effective/provenance only when resolved.
      expect(component.getAllByText('Static').length).toBeGreaterThan(0);
      expect(component.queryByText('Effective')).not.toBeInTheDocument();
      expect(component.queryByText('Provenance:')).not.toBeInTheDocument();
    });
  });
});
