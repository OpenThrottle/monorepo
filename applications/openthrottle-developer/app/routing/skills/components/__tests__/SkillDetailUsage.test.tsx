import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillDetailUsage } from '../SkillDetailUsage';
import type { SkillDetailUsageProps } from '../SkillDetailUsage';
import { SKILL_USAGE_DETAIL_COPY } from '../../data/data.copy';
import type { SkillDetailUsageSkillStats } from '../../data/skill-usage-detail';

const buildSkill = (
  overrides: Partial<SkillDetailUsageSkillStats> = {},
): SkillDetailUsageSkillStats => ({
  abandonedCount: 1,
  avgDurationMs: 1500,
  count: 12,
  errorCount: 0,
  lastUsedAt: '2026-08-05T12:00:00.000Z',
  outcomeCount: 3,
  scope: 'ours',
  skillName: 'ot-plans',
  successCount: 2,
  ...overrides,
});

const renderComponent = (props: SkillDetailUsageProps): RenderResult => {
  const Component = (): React.ReactElement => <SkillDetailUsage {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillDetailUsage Component', () => {
  test('renders the unavailable notice when usage could not be loaded', () => {
    const component = renderComponent({
      rangeDays: 30,
      usage: { available: false },
    });

    expect(
      component.getByTestId('SkillDetailUsageUnavailable'),
    ).toHaveTextContent(SKILL_USAGE_DETAIL_COPY.unavailableNotice);
    expect(
      component.queryByTestId('SkillDetailUsageStats'),
    ).not.toBeInTheDocument();
    // Back-link to /usage closes the loop even in the degraded state.
    expect(
      component.getByRole('link', {
        name: SKILL_USAGE_DETAIL_COPY.backToUsage,
      }),
    ).toHaveAttribute('href', '/usage');
  });

  test('renders the empty state for a skill with no invocations in range', () => {
    const component = renderComponent({
      rangeDays: 30,
      usage: { available: true, byDay: [], skill: null },
    });

    expect(component.getByTestId('SkillDetailUsageEmpty')).toHaveTextContent(
      SKILL_USAGE_DETAIL_COPY.emptyNotice,
    );
    expect(
      component.queryByTestId('SkillDetailUsageStats'),
    ).not.toBeInTheDocument();
  });

  test('renders all six headline stats and the outcome breakdown when populated', () => {
    const component = renderComponent({
      rangeDays: 30,
      usage: {
        available: true,
        byDay: [
          {
            date: '2026-08-05',
            oursCount: 12,
            thirdPartyCount: 0,
            totalCount: 12,
          },
        ],
        skill: buildSkill(),
      },
    });

    const stats = component.getByTestId('SkillDetailUsageStats');
    expect(stats).toBeInTheDocument();

    // 1) total invocations, 2) scope badge, 3) outcomes reported (n/total),
    // 4) success rate (2/3 -> 67%), 5) avg duration (1500ms -> 1.5s), 6) last used.
    expect(component.getByText('12')).toBeInTheDocument();
    expect(component.getAllByText('Ours').length).toBeGreaterThan(0);
    expect(component.getByText('3/12')).toBeInTheDocument();
    expect(component.getByText('67%')).toBeInTheDocument();
    expect(component.getByText('1.5s')).toBeInTheDocument();
    expect(
      component.getByText(SKILL_USAGE_DETAIL_COPY.lastUsedTile),
    ).toBeInTheDocument();

    // Outcome breakdown + shared daily chart.
    expect(
      component.getByTestId('SkillDetailUsageOutcomes'),
    ).toBeInTheDocument();
    expect(component.getByTestId('SkillUsageDailyChart')).toBeInTheDocument();
  });
});
