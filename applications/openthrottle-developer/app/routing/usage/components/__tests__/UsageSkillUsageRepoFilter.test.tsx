import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';

import { SKILL_USAGE_SCOPES } from '../../data/data.skill-usage-copy';
import type { UsageSkillUsageRepoFilterProps } from '../UsageSkillUsageRepoFilter';
import { UsageSkillUsageRepoFilter } from '../UsageSkillUsageRepoFilter';

const REPO = 'https://github.com/org/repo';

const buildFilterOptions = (
  overrides: Partial<UsageSkillUsageFilterOptionsFragment> = {},
): UsageSkillUsageFilterOptionsFragment => {
  return {
    cwds: [],
    gitBranches: [],
    repoIdentities: [],
    ...overrides,
  };
};

const baseProps = (): UsageSkillUsageRepoFilterProps => {
  return {
    accountParam: null,
    filterOptions: buildFilterOptions(),
    providerParam: null,
    selectedCwd: null,
    selectedGitBranch: null,
    selectedRepo: null,
    selectedScope: null,
  };
};

const renderComponent = (
  props: UsageSkillUsageRepoFilterProps,
): RenderResult => {
  const Component = (): React.ReactElement => {
    return <UsageSkillUsageRepoFilter {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UsageSkillUsageRepoFilter Component', () => {
  describe('when no row carries a repo identity or a cwd', () => {
    test('renders nothing', () => {
      const component = renderComponent(baseProps());

      expect(component.queryByTestId('UsageSkillUsageRepoFilter')).toBeNull();
    });
  });

  describe('when rows carry repo identities', () => {
    test('offers repositories, preserves filters and marks the active chip', () => {
      const component = renderComponent({
        ...baseProps(),
        filterOptions: buildFilterOptions({
          cwds: ['/Users/someone/repo'],
          repoIdentities: [REPO],
        }),
        providerParam: 'claude',
        selectedGitBranch: 'main',
        selectedRepo: REPO,
        selectedScope: SKILL_USAGE_SCOPES.OURS,
      });

      expect(
        component.getByRole('group', {
          name: 'Filter skill usage by repository',
        }),
      ).toBeInTheDocument();
      const repoLink = component.getByRole('link', { name: 'org/repo' });
      expect(repoLink).toHaveAttribute('aria-current', 'true');
      expect(repoLink).toHaveAttribute('title', REPO);
      const href = repoLink.getAttribute('href') ?? '';
      expect(href).toContain(`skillRepo=${encodeURIComponent(REPO)}`);
      expect(href).toContain('provider=claude');
      expect(href).toContain('skillBranch=main');
      expect(href).toContain('skillScope=ours');
      // The path chips are not offered alongside the repositories.
      expect(component.queryByTitle('/Users/someone/repo')).toBeNull();
    });

    test('clears a deprecated cwd selection when a repository is picked', () => {
      const component = renderComponent({
        ...baseProps(),
        filterOptions: buildFilterOptions({ repoIdentities: [REPO] }),
        selectedCwd: '/Users/someone/repo',
      });

      const repoLink = component.getByRole('link', { name: 'org/repo' });
      expect(repoLink.getAttribute('href')).not.toContain('skillCwd');
    });
  });

  describe('when only cwds are present', () => {
    test('falls back to the path chips', () => {
      const component = renderComponent({
        ...baseProps(),
        filterOptions: buildFilterOptions({ cwds: ['/work/openthrottle'] }),
      });

      expect(
        component.getByRole('group', {
          name: 'Filter skill usage by project path',
        }),
      ).toBeInTheDocument();
      const cwdLink = component.getByRole('link', { name: 'openthrottle' });
      expect(cwdLink.getAttribute('href')).toContain(
        'skillCwd=%2Fwork%2Fopenthrottle',
      );
    });
  });
});
