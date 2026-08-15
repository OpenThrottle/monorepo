import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillUsageLeaderboard } from '../SkillUsageLeaderboard';
import type { SkillUsageLeaderboardProps } from '../SkillUsageLeaderboard';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '../../data/skill-usage-copy';
import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';

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

const renderComponent = (props: SkillUsageLeaderboardProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <SkillUsageLeaderboard {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillUsageLeaderboard Component', () => {
  test('renders the column headers and scope badges', () => {
    const component = renderComponent({
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
      linkableSlugs: ['ot-plans'],
    });

    expect(
      component.getByRole('columnheader', { name: 'Skill' }),
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
    expect(component.getByText('Ours')).toBeInTheDocument();
    expect(component.getByText('Third-party')).toBeInTheDocument();
  });

  test('links linkable slugs and leaves non-linkable rows as plain text', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({ scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' }),
        buildBySkill({
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
      linkableSlugs: ['ot-plans'],
    });

    expect(component.getByRole('link', { name: 'ot-plans' })).toHaveAttribute(
      'href',
      '/skills/ot-plans',
    );
    expect(
      component.queryByRole('link', { name: 'vercel:deploy' }),
    ).not.toBeInTheDocument();
    expect(
      component.getByRole('cell', { name: 'vercel:deploy' }),
    ).toBeInTheDocument();
  });

  test('accepts a ReadonlySet for linkableSlugs and percent-encodes colons', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'engineering:code-review',
        }),
      ],
      linkableSlugs: new Set(['engineering:code-review']),
    });

    expect(
      component.getByRole('link', { name: 'engineering:code-review' }),
    ).toHaveAttribute('href', '/skills/engineering%3Acode-review');
  });
});
