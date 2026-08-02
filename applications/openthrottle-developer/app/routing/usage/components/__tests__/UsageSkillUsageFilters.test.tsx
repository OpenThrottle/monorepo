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
  filterOptions: buildFilterOptions(),
  providerParam: null,
  selectedCwd: null,
  selectedGitBranch: null,
  selectedScope: null,
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

  test('branch and cwd filters preserve provider and mark active chips', () => {
    const component = renderComponent({
      ...baseProps(),
      filterOptions: buildFilterOptions({
        cwds: ['/Users/matt/openthrottle'],
        gitBranches: ['example-usage-tracking'],
      }),
      providerParam: 'claude',
      selectedCwd: '/Users/matt/openthrottle',
      selectedGitBranch: 'example-usage-tracking',
      selectedScope: SKILL_USAGE_SCOPES.THIRD_PARTY,
    });

    const branchLink = component.getByRole('link', {
      name: 'example-usage-tracking',
    });
    expect(branchLink).toHaveAttribute('aria-current', 'true');
    expect(branchLink.getAttribute('href')).toContain('provider=claude');
    expect(branchLink.getAttribute('href')).toContain('skillScope=third-party');
    expect(branchLink.getAttribute('href')).toContain(
      'skillBranch=example-usage-tracking',
    );

    const cwdLink = component.getByRole('link', { name: 'openthrottle' });
    expect(cwdLink).toHaveAttribute('aria-current', 'true');
    expect(cwdLink).toHaveAttribute('title', '/Users/matt/openthrottle');
  });
});
