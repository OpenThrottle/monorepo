import * as React from 'react';
import { cleanup, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsTable } from '../SkillsTable';
import type { SkillsTableProps } from '../SkillsTable';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

const mockEntries: readonly RepoSkillEntry[] = [
  {
    disableModelInvocation: undefined,
    layout: 'agents',
    repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
    slug: 'brag-sheet',
    source: 'external',
    summary: 'Build impact statements from commits and PR activity.',
    tags: undefined,
  },
  {
    disableModelInvocation: undefined,
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    source: 'external',
    summary: 'Explore Nx projects, targets, and dependency graph.',
    tags: undefined,
  },
];

// One entry per tri-state of disable-model-invocation, to exercise the
// "Model invocation" column badge.
const triStateEntries: readonly RepoSkillEntry[] = [
  {
    disableModelInvocation: true,
    layout: 'agents',
    repoRelativePath: '.agents/skills/github-commit/SKILL.md',
    slug: 'github-commit',
    source: 'external',
    summary: 'Commit via a guarded skill.',
    tags: ['git', 'github'],
  },
  {
    disableModelInvocation: false,
    layout: 'agents',
    repoRelativePath: '.agents/skills/agents-ralph/SKILL.md',
    slug: 'agents-ralph',
    source: 'external',
    summary: 'Ralph loop.',
    tags: ['planning'],
  },
  {
    disableModelInvocation: undefined,
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    source: 'external',
    summary: 'Explore the Nx workspace.',
    tags: undefined,
  },
];

describe('SkillsTable Component', () => {
  let props: SkillsTableProps;

  beforeEach(() => {
    props = {};
  });

  test('when entries is empty renders SkillsEmpty inside the table', () => {
    renderRoutesStub(<SkillsTable {...props} />);

    expect(
      screen.getByText(
        'No skills found, create your first skill to get started.',
      ),
    ).toBeInTheDocument();
  });

  describe('when entries are provided', () => {
    beforeEach(() => {
      cleanup();
      props = { entries: [...mockEntries] };
    });

    test('renders table shell and column headers', () => {
      renderRoutesStub(<SkillsTable {...props} />);

      expect(screen.getByTestId('SkillsTable')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Owner' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Summary' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Model invocation' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Actions' }),
      ).toBeInTheDocument();
    });

    test('renders table rows from entries', () => {
      renderRoutesStub(<SkillsTable {...props} />);

      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('/brag-sheet')).toBeInTheDocument();
      expect(screen.getByText('/nx-workspace')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Build impact statements from commits and PR activity.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Explore Nx projects, targets, and dependency graph.'),
      ).toBeInTheDocument();
    });
  });

  describe('Source column (provenance badge)', () => {
    const sourceEntries: readonly RepoSkillEntry[] = [
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/ot-plans/SKILL.md',
        slug: 'ot-plans',
        source: 'openthrottle',
        summary: 'OpenThrottle plans skill.',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
        slug: 'brag-sheet',
        source: 'external',
        sourceUrl: 'https://example.com/skills/brag-sheet',
        summary: 'Vendored skill with an origin URL.',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/create-cli/SKILL.md',
        slug: 'create-cli',
        source: 'external',
        summary: 'Vendored skill without an origin URL.',
        tags: undefined,
      },
    ];

    let component: RenderResult;

    beforeEach(() => {
      cleanup();
      component = renderRoutesStub(
        <SkillsTable entries={[...sourceEntries]} />,
      );
    });

    test('renders the Source column header', () => {
      expect(
        component.getByRole('columnheader', { name: 'Source' }),
      ).toBeInTheDocument();
    });

    test('renders an OpenThrottle badge for source: openthrottle', () => {
      expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    });

    test('renders an External badge per external entry', () => {
      expect(component.getAllByText('External')).toHaveLength(2);
    });

    test('links the external badge to its sourceUrl when present', () => {
      const link = component.getByTestId('skill-source-link');

      expect(link).toHaveAttribute(
        'href',
        'https://example.com/skills/brag-sheet',
      );
      expect(link).toHaveAttribute('target', '_blank');
    });

    test('renders exactly one origin link (url-less entries stay plain badges)', () => {
      expect(component.getAllByTestId('skill-source-badge')).toHaveLength(3);
      expect(component.getAllByTestId('skill-source-link')).toHaveLength(1);
    });
  });

  describe('Model invocation column (tri-state badge)', () => {
    let component: RenderResult;

    beforeEach(() => {
      cleanup();
      component = renderRoutesStub(
        <SkillsTable entries={[...triStateEntries]} />,
      );
    });

    test('renders the "Manual only" badge for disable-model-invocation: true', () => {
      expect(component.getByText('Manual only')).toBeInTheDocument();
    });

    test('renders the "Auto enabled" badge for disable-model-invocation: false', () => {
      expect(component.getByText('Auto enabled')).toBeInTheDocument();
    });

    test('renders the "Default (auto)" badge when the flag is unset', () => {
      expect(component.getByText('Default (auto)')).toBeInTheDocument();
    });

    test('hovering a badge does not remove it (tooltip trigger is inert to display)', async () => {
      const user = userEvent.setup();

      await user.hover(component.getByText('Manual only'));

      expect(component.getByText('Manual only')).toBeInTheDocument();
    });
  });

  describe('Model invocation column (effective-first, resolved)', () => {
    test('shows the effective state and an override indicator when effective diverges from static', () => {
      const component = renderRoutesStub(
        <SkillsTable
          entries={[
            {
              disableModelInvocation: true,
              effectiveDisableModelInvocation: false,
              layout: 'agents',
              provenance: 'tag-allow:github@rule-1',
              repoRelativePath: '.agents/skills/git-commit/SKILL.md',
              slug: 'git-commit',
              source: 'external',
              summary: 'Commit skill re-enabled by a tag rule.',
              tags: ['git'],
            },
          ]}
        />,
      );

      // Effective (false → "Auto enabled") wins over the static "Manual only".
      expect(component.getByText('Auto enabled')).toBeInTheDocument();
      expect(component.queryByText('Manual only')).not.toBeInTheDocument();
      expect(
        component.getByTestId('model-invocation-override'),
      ).toBeInTheDocument();
    });

    test('shows no override indicator when effective matches the normalized static value', () => {
      const component = renderRoutesStub(
        <SkillsTable
          entries={[
            {
              disableModelInvocation: undefined,
              effectiveDisableModelInvocation: false,
              layout: 'agents',
              provenance: 'frontmatter:unset',
              repoRelativePath: '.agents/skills/planner/SKILL.md',
              slug: 'planner',
              source: 'external',
              summary: 'Planner.',
              tags: undefined,
            },
          ]}
        />,
      );

      expect(component.getByText('Auto enabled')).toBeInTheDocument();
      expect(
        component.queryByTestId('model-invocation-override'),
      ).not.toBeInTheDocument();
    });

    test('no-config invariant: frontmatter provenance renders the same state as the static-only path (no indicator)', () => {
      // Passthrough result: effective === (static ?? false) for every skill.
      const component = renderRoutesStub(
        <SkillsTable
          entries={[
            {
              disableModelInvocation: true,
              effectiveDisableModelInvocation: true,
              layout: 'agents',
              provenance: 'frontmatter:true',
              repoRelativePath: '.agents/skills/guarded/SKILL.md',
              slug: 'guarded',
              source: 'external',
              summary: 'Statically guarded, no rules.',
              tags: undefined,
            },
          ]}
        />,
      );

      // Same badge the static path would show, and crucially no override mark.
      expect(component.getByText('Manual only')).toBeInTheDocument();
      expect(
        component.queryByTestId('model-invocation-override'),
      ).not.toBeInTheDocument();
    });

    test('falls back to the static tri-state badge when no resolved value is present', () => {
      const component = renderRoutesStub(
        <SkillsTable
          entries={[
            {
              disableModelInvocation: true,
              layout: 'agents',
              repoRelativePath: '.agents/skills/legacy/SKILL.md',
              slug: 'legacy',
              source: 'external',
              summary: 'No availability resolved.',
              tags: undefined,
            },
          ]}
        />,
      );

      expect(component.getByText('Manual only')).toBeInTheDocument();
      expect(
        component.queryByTestId('model-invocation-override'),
      ).not.toBeInTheDocument();
    });
  });
});
