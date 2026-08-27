import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsIndexUsage } from '../SkillsIndexUsage';
import type { SkillsIndexUsageProps } from '../SkillsIndexUsage';
import { SKILLS_INDEX_USAGE_COPY } from '~/routing/skills/data/data.copy';
import { SKILL_PRESENCE_LABELS } from '~/routing/usage/data/skill-presence';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '~/routing/usage/data/skill-usage-copy';
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

const renderComponent = (props: SkillsIndexUsageProps): RenderResult => {
  const Component = (): React.ReactElement => <SkillsIndexUsage {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillsIndexUsage Component', () => {
  test('renders the unavailable notice without any leaderboard', () => {
    const component = renderComponent({
      presentSlugs: [],
      rangeDays: 30,
      usage: { available: false },
    });

    expect(
      component.getByTestId('SkillsIndexUsageUnavailable'),
    ).toHaveTextContent(SKILLS_INDEX_USAGE_COPY.unavailableNotice);
    expect(
      component.queryByTestId('SkillUsageLeaderboard'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('SkillsIndexUsageMissing'),
    ).not.toBeInTheDocument();
  });

  test('renders the empty message and no missing section when there are no rows', () => {
    const component = renderComponent({
      presentSlugs: ['ot-plans'],
      rangeDays: 30,
      usage: { available: true, byDay: [], bySkill: [] },
    });

    expect(component.getByTestId('SkillsIndexUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.empty,
    );
    expect(
      component.queryByTestId('SkillsIndexUsageMissing'),
    ).not.toBeInTheDocument();
  });

  test('omits the missing section entirely when every row is present on disk', () => {
    const component = renderComponent({
      presentSlugs: ['ot-plans', 'ot-stack'],
      rangeDays: 30,
      usage: {
        available: true,
        byDay: [],
        bySkill: [
          buildBySkill({ skillName: 'ot-plans' }),
          buildBySkill({ skillName: 'ot-stack' }),
          buildBySkill({
            scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
            skillName: 'vercel:deploy',
          }),
        ],
      },
    });

    expect(component.getByTestId('SkillUsageLeaderboard')).toBeInTheDocument();
    expect(
      component.queryByTestId('SkillsIndexUsageMissing'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('skill-presence-badge'),
    ).not.toBeInTheDocument();
  });

  test('splits missing rows out of Top skills into their own section', () => {
    const component = renderComponent({
      presentSlugs: ['ot-plans'],
      rangeDays: 30,
      usage: {
        available: true,
        byDay: [],
        bySkill: [
          buildBySkill({ count: 90, skillName: 'renamed-away' }),
          buildBySkill({ count: 10, skillName: 'ot-plans' }),
        ],
      },
    });

    const missingSection = component.getByTestId('SkillsIndexUsageMissing');

    expect(missingSection).toHaveTextContent(SKILL_USAGE_COPY.missingHeading);
    expect(missingSection).toHaveTextContent(SKILL_USAGE_COPY.missingIntro);
    expect(missingSection).toHaveTextContent('renamed-away');
    expect(missingSection).toHaveTextContent(SKILL_PRESENCE_LABELS.missing);

    // The higher-count missing row must not outrank the live skill in the
    // primary table — that is the whole point of the split.
    const [topSkills] = component.getAllByTestId('SkillUsageLeaderboard');
    expect(topSkills).toHaveTextContent('ot-plans');
    expect(topSkills).not.toHaveTextContent('renamed-away');
  });

  test('never links a missing row through to a detail page', () => {
    const component = renderComponent({
      presentSlugs: [],
      rangeDays: 30,
      usage: {
        available: true,
        byDay: [],
        bySkill: [buildBySkill({ skillName: 'renamed-away' })],
      },
    });

    expect(
      component.queryByRole('link', { name: 'renamed-away' }),
    ).not.toBeInTheDocument();
  });

  test('explains an all-missing window instead of rendering an empty Top skills table', () => {
    const component = renderComponent({
      presentSlugs: [],
      rangeDays: 30,
      usage: {
        available: true,
        byDay: [],
        bySkill: [buildBySkill({ skillName: 'renamed-away' })],
      },
    });

    expect(component.getByTestId('SkillsIndexUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_COPY.empty,
    );
    expect(
      component.getByTestId('SkillsIndexUsageMissing'),
    ).toBeInTheDocument();
  });

  test('acknowledges the split in the section intro', () => {
    const component = renderComponent({
      presentSlugs: [],
      rangeDays: 30,
      usage: { available: true, byDay: [], bySkill: [] },
    });

    expect(
      component.getByText(SKILLS_INDEX_USAGE_COPY.intro(30)),
    ).toBeInTheDocument();
  });
});
