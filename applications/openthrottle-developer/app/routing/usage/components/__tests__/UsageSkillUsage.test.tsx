import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UsageSkillUsage } from '../UsageSkillUsage';
import type { UsageSkillUsageProps } from '../UsageSkillUsage';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '../../data/skill-usage-copy';
import type {
  UsageSkillUsageByDayFragment,
  UsageSkillUsageByScopeFragment,
  UsageSkillUsageBySkillFragment,
  UsageSkillUsageFilterOptionsFragment,
} from '~/__generated__/graphql';

const buildBySkill = (
  overrides: Partial<UsageSkillUsageBySkillFragment>,
): UsageSkillUsageBySkillFragment => ({
  count: 1,
  scope: SKILL_USAGE_SCOPES.OURS,
  skillName: 'ot-plans',
  ...overrides,
});

const buildByScope = (
  overrides: Partial<UsageSkillUsageByScopeFragment>,
): UsageSkillUsageByScopeFragment => ({
  count: 0,
  scope: SKILL_USAGE_SCOPES.OURS,
  ...overrides,
});

const buildByDay = (
  overrides: Partial<UsageSkillUsageByDayFragment>,
): UsageSkillUsageByDayFragment => ({
  date: '2026-07-15',
  oursCount: 0,
  thirdPartyCount: 0,
  totalCount: 0,
  ...overrides,
});

const buildFilterOptions = (
  overrides: Partial<UsageSkillUsageFilterOptionsFragment> = {},
): UsageSkillUsageFilterOptionsFragment => ({
  cwds: [],
  gitBranches: [],
  ...overrides,
});

const renderComponent = (props: UsageSkillUsageProps): RenderResult => {
  const Component = (): React.ReactElement => <UsageSkillUsage {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const baseProps = (): UsageSkillUsageProps => ({
  byDay: [],
  byScope: [],
  bySkill: [],
  filterOptions: buildFilterOptions(),
  providerParam: null,
  rangeDays: 30,
  selectedCwd: null,
  selectedGitBranch: null,
  selectedScope: null,
  totalCount: 0,
});

describe('UsageSkillUsage Component', () => {
  test('renders heading, scope split tiles, and empty state', () => {
    const component = renderComponent(baseProps());

    expect(
      component.getByRole('heading', { name: SKILL_USAGE_COPY.heading }),
    ).toBeInTheDocument();
    expect(component.getByTestId('UsageSkillUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.empty,
    );
    expect(component.getByText('Total invocations')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        name: SKILL_USAGE_COPY.leaderboardHeading,
      }),
    ).toBeInTheDocument();
  });

  test('renders leaderboard rows with ours vs third-party labels', () => {
    const component = renderComponent({
      ...baseProps(),
      byScope: [
        buildByScope({ count: 5, scope: SKILL_USAGE_SCOPES.OURS }),
        buildByScope({ count: 2, scope: SKILL_USAGE_SCOPES.THIRD_PARTY }),
      ],
      bySkill: [
        buildBySkill({
          count: 5,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
        }),
        buildBySkill({
          count: 2,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
      totalCount: 7,
    });

    expect(
      component.getByRole('cell', { name: 'ot-plans' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('cell', { name: 'vercel:deploy' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Scope' }),
    ).toBeInTheDocument();
    expect(component.getAllByText('Ours').length).toBeGreaterThan(0);
    expect(component.getAllByText('Third-party').length).toBeGreaterThan(0);
    expect(component.getByText('7')).toBeInTheDocument();
  });

  test('scope filter links target skillScope and mark the active one', () => {
    const component = renderComponent({
      ...baseProps(),
      selectedScope: SKILL_USAGE_SCOPES.OURS,
    });

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

  test('shows filtered empty copy when filters are active and no rows', () => {
    const component = renderComponent({
      ...baseProps(),
      selectedScope: SKILL_USAGE_SCOPES.OURS,
    });

    expect(component.getByTestId('UsageSkillUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.emptyFiltered,
    );
  });

  test('mounts the over-time chart with daily series data', () => {
    const component = renderComponent({
      ...baseProps(),
      byDay: [
        buildByDay({
          date: '2026-07-15',
          oursCount: 3,
          thirdPartyCount: 1,
          totalCount: 4,
        }),
      ],
    });

    expect(
      component.getByRole('heading', {
        name: SKILL_USAGE_COPY.overTimeHeading,
      }),
    ).toBeInTheDocument();
    expect(component.getByTestId('UsageSkillUsageChart')).toBeInTheDocument();
  });
});
