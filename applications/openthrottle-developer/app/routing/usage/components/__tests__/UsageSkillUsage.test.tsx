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
  abandonedCount: 0,
  avgDurationMs: null,
  count: 1,
  errorCount: 0,
  outcomeCount: 0,
  scope: SKILL_USAGE_SCOPES.OURS,
  skillName: 'ot-plans',
  successCount: 0,
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
  branchOptions: [],
  branchesHaveMore: false,
  byDay: [],
  byScope: [],
  bySkill: [],
  end: '2026-07-31',
  filterOptions: buildFilterOptions(),
  presentSlugs: [],
  providerParam: null,
  rangeDays: 30,
  selectedCwd: null,
  selectedGitBranch: null,
  selectedScope: null,
  start: '2026-07-01',
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
          avgDurationMs: 1500,
          count: 5,
          outcomeCount: 3,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
          successCount: 3,
        }),
        buildBySkill({
          count: 2,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
      presentSlugs: ['ot-plans'],
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
    expect(
      component.getByRole('columnheader', {
        name: SKILL_USAGE_COPY.outcomesColumn,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', {
        name: SKILL_USAGE_COPY.avgDurationColumn,
      }),
    ).toBeInTheDocument();
    expect(component.getByRole('cell', { name: '3/5' })).toBeInTheDocument();
    expect(component.getByRole('cell', { name: '1.5s' })).toBeInTheDocument();
    expect(component.getAllByText('Ours').length).toBeGreaterThan(0);
    expect(component.getAllByText('Third-party').length).toBeGreaterThan(0);
    expect(component.getByText('7')).toBeInTheDocument();
  });

  test('links only rows whose skillName matches a discovered on-disk slug', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [
        buildBySkill({ scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' }),
        buildBySkill({
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
      presentSlugs: ['ot-plans'],
    });

    const link = component.getByRole('link', { name: 'ot-plans' });
    expect(link).toHaveAttribute('href', '/skills/ot-plans');

    // Third-party row with no on-disk skill stays plain text (no 404 link).
    expect(
      component.queryByRole('link', { name: 'vercel:deploy' }),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('cell', { name: 'vercel:deploy' }),
    ).toBeInTheDocument();
  });

  test('percent-encodes a linkable slug containing a colon in the href', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [
        buildBySkill({
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'engineering:code-review',
        }),
      ],
      presentSlugs: ['engineering:code-review'],
    });

    expect(
      component.getByRole('link', { name: 'engineering:code-review' }),
    ).toHaveAttribute('href', '/skills/engineering%3Acode-review');
  });

  test('splits missing rows out of Top skills into their own section', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [
        buildBySkill({ count: 90, skillName: 'renamed-away' }),
        buildBySkill({ count: 10, skillName: 'ot-plans' }),
      ],
      presentSlugs: ['ot-plans'],
    });

    const missingSection = component.getByTestId('UsageSkillUsageMissing');

    expect(missingSection).toHaveTextContent(SKILL_USAGE_COPY.missingHeading);
    expect(missingSection).toHaveTextContent(SKILL_USAGE_COPY.missingIntro);
    expect(missingSection).toHaveTextContent('renamed-away');

    const [topSkills] = component.getAllByTestId('SkillUsageLeaderboard');
    expect(topSkills).toHaveTextContent('ot-plans');
    expect(topSkills).not.toHaveTextContent('renamed-away');
  });

  test('omits the missing section when every row is present on disk', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [buildBySkill({ skillName: 'ot-plans' })],
      presentSlugs: ['ot-plans'],
    });

    expect(
      component.queryByTestId('UsageSkillUsageMissing'),
    ).not.toBeInTheDocument();
  });

  test('shows the filtered empty copy when filters narrow the ranked bucket to nothing but missing rows', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [buildBySkill({ skillName: 'renamed-away' })],
      presentSlugs: [],
      selectedScope: SKILL_USAGE_SCOPES.OURS,
    });

    expect(component.getByTestId('UsageSkillUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.emptyFiltered,
    );
    expect(component.getByTestId('UsageSkillUsageMissing')).toBeInTheDocument();
  });

  test('shows the unfiltered empty copy for an all-missing window with no filters', () => {
    const component = renderComponent({
      ...baseProps(),
      bySkill: [buildBySkill({ skillName: 'renamed-away' })],
      presentSlugs: [],
    });

    expect(component.getByTestId('UsageSkillUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.empty,
    );
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

  test('renders the branch dropdown and cwd chips, preserving provider', () => {
    const component = renderComponent({
      ...baseProps(),
      branchOptions: [{ branch: 'example-usage-tracking', count: 3 }],
      filterOptions: buildFilterOptions({
        cwds: ['/Users/matt/openthrottle'],
      }),
      providerParam: 'claude',
      selectedCwd: '/Users/matt/openthrottle',
      selectedGitBranch: 'example-usage-tracking',
      selectedScope: SKILL_USAGE_SCOPES.THIRD_PARTY,
    });

    expect(component.getByRole('combobox')).toHaveTextContent(
      'example-usage-tracking',
    );

    const cwdLink = component.getByRole('link', { name: 'openthrottle' });
    expect(cwdLink).toHaveAttribute('aria-current', 'true');
    expect(cwdLink).toHaveAttribute('title', '/Users/matt/openthrottle');
    expect(cwdLink.getAttribute('href')).toContain('provider=claude');
    expect(cwdLink.getAttribute('href')).toContain(
      'skillBranch=example-usage-tracking',
    );
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
    expect(component.getByTestId('SkillUsageDailyChart')).toBeInTheDocument();
  });
});
