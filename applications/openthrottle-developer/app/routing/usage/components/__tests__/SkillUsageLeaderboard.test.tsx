import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillUsageLeaderboard } from '../SkillUsageLeaderboard';
import type { SkillUsageLeaderboardProps } from '../SkillUsageLeaderboard';
import {
  SKILL_PRESENCE,
  SKILL_PRESENCE_LABELS,
  SKILL_PRESENCE_TOOLTIPS,
} from '../../data/skill-presence';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '../../data/skill-usage-copy';
import type { SkillUsageRowWithPresence } from '../../utils/partition-skill-usage-by-presence';

const buildBySkill = (
  overrides: Partial<SkillUsageRowWithPresence>,
): SkillUsageRowWithPresence => ({
  abandonedCount: 0,
  avgDurationMs: null,
  count: 1,
  errorCount: 0,
  outcomeCount: 0,
  presence: SKILL_PRESENCE.INSTALLED,
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
          presence: SKILL_PRESENCE.INSTALLED,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
          successCount: 3,
        }),
        buildBySkill({
          count: 2,
          presence: SKILL_PRESENCE.EXTERNAL,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
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

  test('links installed rows and leaves external rows as plain text', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          presence: SKILL_PRESENCE.INSTALLED,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
        }),
        buildBySkill({
          presence: SKILL_PRESENCE.EXTERNAL,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
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

  test('percent-encodes colons in the detail-page href', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          presence: SKILL_PRESENCE.INSTALLED,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'engineering:code-review',
        }),
      ],
    });

    expect(
      component.getByRole('link', { name: 'engineering:code-review' }),
    ).toHaveAttribute('href', '/skills/engineering%3Acode-review');
  });

  test('badges a missing row and never links it', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          presence: SKILL_PRESENCE.MISSING,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'renamed-away',
        }),
      ],
    });

    const badge = component.getByTestId('skill-presence-badge');

    expect(badge).toHaveTextContent(SKILL_PRESENCE_LABELS.missing);
    expect(badge).toHaveAttribute('title', SKILL_PRESENCE_TOOLTIPS.missing);
    expect(
      component.queryByRole('link', { name: 'renamed-away' }),
    ).not.toBeInTheDocument();
  });

  test('keeps the scope badge alongside the presence badge, since they are different axes', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          presence: SKILL_PRESENCE.MISSING,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'renamed-away',
        }),
      ],
    });

    expect(component.getByText('Ours')).toBeInTheDocument();
    expect(component.getByTestId('skill-presence-badge')).toBeInTheDocument();
  });

  test('renders neither a badge nor a link for an external row', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({
          presence: SKILL_PRESENCE.EXTERNAL,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        }),
      ],
    });

    expect(
      component.queryByTestId('skill-presence-badge'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('link', { name: 'vercel:deploy' }),
    ).not.toBeInTheDocument();
  });

  test('renders no presence badge for an installed row', () => {
    const component = renderComponent({
      bySkill: [buildBySkill({ presence: SKILL_PRESENCE.INSTALLED })],
    });

    expect(
      component.queryByTestId('skill-presence-badge'),
    ).not.toBeInTheDocument();
  });

  test('renders exactly the rows it is given, in order', () => {
    const component = renderComponent({
      bySkill: [
        buildBySkill({ count: 3, skillName: 'b-skill' }),
        buildBySkill({ count: 9, skillName: 'a-skill' }),
      ],
    });

    const names = component
      .getAllByRole('link')
      .map((link) => link.textContent);

    expect(names).toEqual(['b-skill', 'a-skill']);
  });
});
