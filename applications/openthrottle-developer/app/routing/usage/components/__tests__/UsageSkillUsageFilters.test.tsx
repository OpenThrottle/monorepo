import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UsageSkillUsageFilters } from '../UsageSkillUsageFilters';
import type { UsageSkillUsageFiltersProps } from '../UsageSkillUsageFilters';
import { SKILL_USAGE_SCOPES } from '../../data/skill-usage-copy';
import type { UsageSkillUsageFilterOptionsFragment } from '~/__generated__/graphql';

const buildFilterOptions = (
  overrides: Partial<UsageSkillUsageFilterOptionsFragment> = {},
): UsageSkillUsageFilterOptionsFragment => ({
  cwds: [],
  gitBranches: [],
  ...overrides,
});

const renderComponent = (props: UsageSkillUsageFiltersProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <UsageSkillUsageFilters {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const baseProps = (): UsageSkillUsageFiltersProps => ({
  branchOptions: [],
  branchesHaveMore: false,
  end: '2026-07-31',
  filterOptions: buildFilterOptions(),
  providerParam: null,
  selectedCwd: null,
  selectedGitBranch: null,
  selectedScope: null,
  start: '2026-07-01',
});

describe('UsageSkillUsageFilters Component', () => {
  test('renders scope filter chips and marks the active scope', () => {
    const component = renderComponent({
      ...baseProps(),
      selectedScope: SKILL_USAGE_SCOPES.OURS,
    });

    expect(component.getByTestId('UsageSkillUsageFilters')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'All scopes' })).toHaveAttribute(
      'href',
      '/',
    );
    const oursLink = component.getByRole('link', { name: 'Ours' });
    expect(oursLink).toHaveAttribute('href', '/?skillScope=ours');
    expect(oursLink).toHaveAttribute('aria-current', 'true');
    expect(
      component.getByRole('link', { name: 'Third-party' }),
    ).toHaveAttribute('href', '/?skillScope=third-party');
  });

  test('renders the branch dropdown instead of a chip per branch', () => {
    const component = renderComponent({
      ...baseProps(),
      branchOptions: [
        { branch: 'main', count: 12 },
        { branch: 'example-usage-tracking', count: 3 },
      ],
      selectedGitBranch: 'example-usage-tracking',
    });

    expect(component.getByTestId('UsageBranchFilter')).toBeInTheDocument();
    // The wall of one-link-per-branch is gone: the selection lives on the
    // combobox trigger, not on a link.
    expect(
      component.queryByRole('link', { name: 'example-usage-tracking' }),
    ).toBeNull();
    expect(component.getByRole('combobox')).toHaveTextContent(
      'example-usage-tracking',
    );
  });

  test('cwd filters preserve provider and mark active chips', () => {
    const component = renderComponent({
      ...baseProps(),
      filterOptions: buildFilterOptions({
        cwds: ['/Users/matt/openthrottle'],
      }),
      providerParam: 'claude',
      selectedCwd: '/Users/matt/openthrottle',
      selectedGitBranch: 'example-usage-tracking',
      selectedScope: SKILL_USAGE_SCOPES.THIRD_PARTY,
    });

    const cwdLink = component.getByRole('link', { name: 'openthrottle' });
    expect(cwdLink).toHaveAttribute('aria-current', 'true');
    expect(cwdLink).toHaveAttribute('title', '/Users/matt/openthrottle');
    expect(cwdLink.getAttribute('href')).toContain('provider=claude');
    expect(cwdLink.getAttribute('href')).toContain('skillScope=third-party');
    expect(cwdLink.getAttribute('href')).toContain(
      'skillBranch=example-usage-tracking',
    );
  });
});
