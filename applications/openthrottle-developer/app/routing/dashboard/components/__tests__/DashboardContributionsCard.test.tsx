import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { DashboardContributionsCard } from '../DashboardContributionsCard';
import type { DashboardContributionsCardProps } from '../DashboardContributionsCard';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

// A recent, non-future date so the heatmap (which defaults its window to
// today) renders it as an active cell rather than a placeholder.
const daysAgoIso = (days: number): string => {
  const date = new Date(Date.now() - days * 86_400_000);
  return date.toISOString().slice(0, 10);
};

const RECENT_DATE = daysAgoIso(3);

const dailyStat = (
  overrides: Partial<DashboardDailyStatsCardFragment> & { date: string },
): DashboardDailyStatsCardFragment => ({
  __typename: 'DailyStatsObject',
  plansCompleted: 0,
  plansCreated: 0,
  plansUpdated: 0,
  tasksCompleted: 0,
  tasksCreated: 0,
  tasksUpdated: 0,
  ...overrides,
});

const renderCard = (props: DashboardContributionsCardProps): RenderResult => {
  const Component = () => <DashboardContributionsCard {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('DashboardContributionsCard Component', () => {
  test('renders the card with the total-activity heatmap value for a day', () => {
    const component = renderCard({
      dailyStats: [
        dailyStat({
          date: RECENT_DATE,
          plansCreated: 1,
          plansUpdated: 1,
          tasksCompleted: 2,
        }),
      ],
    });

    expect(
      component.getByTestId('DashboardContributionsCard'),
    ).toBeInTheDocument();
    // Sum mapper: 1 + 1 + 2 = 4 contributions on the day.
    expect(
      component.getByLabelText(`4 contributions on ${RECENT_DATE}`),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /Expand chart details/ }),
    ).toHaveAttribute('href', '/dashboard?modal=daily-stats');
  });

  test('calls onSelectDate with the clicked day', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    const component = renderCard({
      dailyStats: [dailyStat({ date: RECENT_DATE, plansCreated: 5 })],
      onSelectDate,
    });

    await user.click(
      component.getByLabelText(`5 contributions on ${RECENT_DATE}`),
    );

    expect(onSelectDate).toHaveBeenCalledWith(RECENT_DATE);
  });
});
