import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardDailyStatsModal } from '../DashboardDailyStatsModal';
import type { DashboardDailyStatsModalProps } from '../DashboardDailyStatsModal';
import {
  DAILY_STATS_METRICS,
  DAILY_STATS_MODAL_COPY,
} from '~/routing/dashboard/data/data.copy';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

const twoDayStats: ReadonlyArray<DashboardDailyStatsCardFragment> = [
  {
    date: '2026-01-01',
    plansCompleted: 1,
    plansCreated: 2,
    plansUpdated: 0,
    tasksCompleted: 1,
    tasksCreated: 3,
    tasksUpdated: 1,
  },
  {
    date: '2026-01-02',
    plansCompleted: 0,
    plansCreated: 1,
    plansUpdated: 1,
    tasksCompleted: 2,
    tasksCreated: 0,
    tasksUpdated: 0,
  },
];

function renderWithProps(
  props: Partial<DashboardDailyStatsModalProps>,
  initialEntries: readonly string[],
): RenderResult {
  const merged: DashboardDailyStatsModalProps = {
    dailyStats: [...twoDayStats],
    ...props,
  };
  const Component = () => <DashboardDailyStatsModal {...merged} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('DashboardDailyStatsModal Component', () => {
  describe('when modal search param matches', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderWithProps({}, ['/?modal=daily-stats']);
    });

    test('renders modal heading', () => {
      expect(
        component.getByRole('heading', {
          level: 2,
          name: DAILY_STATS_MODAL_COPY.title,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when modal search param does not match', () => {
    test('does not surface modal heading in the accessible tree', () => {
      const component = renderWithProps({}, ['/']);
      expect(
        component.queryByRole('heading', {
          name: DAILY_STATS_MODAL_COPY.title,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a specific day is selected via the date param', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderWithProps({}, ['/?modal=daily-stats&date=2026-01-01']);
    });

    test('renders the selected day, all metric labels, and the mini chart', () => {
      expect(component.getByTestId('daily-stats-detail')).toBeInTheDocument();
      expect(component.getByText('Jan 1')).toBeInTheDocument();
      expect(
        component.getByTestId('DashboardDailyStatsDayChart'),
      ).toBeInTheDocument();

      for (const metric of DAILY_STATS_METRICS) {
        expect(component.getByText(metric.label)).toBeInTheDocument();
      }
    });

    test('renders the selected day metric values in the breakdown', () => {
      const tasksCreated = component.getByText('Tasks created');
      expect(tasksCreated.nextElementSibling?.textContent).toBe('3');

      const plansCreated = component.getByText('Plans created');
      expect(plansCreated.nextElementSibling?.textContent).toBe('2');
    });

    test('does not render the most-recent fallback hint', () => {
      expect(
        component.queryByText(DAILY_STATS_MODAL_COPY.mostRecentHint),
      ).not.toBeInTheDocument();
    });

    test('renders the completion attribution caveat', () => {
      expect(
        component.getByText(DAILY_STATS_MODAL_COPY.completionAttributionCaveat),
      ).toBeInTheDocument();
    });
  });

  describe('when no date param is supplied (Expand chart details entry)', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderWithProps({}, ['/?modal=daily-stats']);
    });

    test('falls back to the most-recent day and shows the hint', () => {
      expect(component.getByText('Jan 2')).toBeInTheDocument();
      expect(
        component.getByText(DAILY_STATS_MODAL_COPY.mostRecentHint),
      ).toBeInTheDocument();
    });
  });

  describe('arrow-key date navigation', () => {
    test('steps to the next day on ArrowRight', async () => {
      const user = userEvent.setup();
      const component = renderWithProps({}, [
        '/?modal=daily-stats&date=2026-01-01',
      ]);
      expect(component.getByText('Jan 1')).toBeInTheDocument();

      await user.keyboard('{ArrowRight}');

      expect(component.getByText('Jan 2')).toBeInTheDocument();
    });

    test('does not step past the most-recent day (clamped to range)', async () => {
      const user = userEvent.setup();
      const component = renderWithProps({}, [
        '/?modal=daily-stats&date=2026-01-02',
      ]);
      expect(component.getByText('Jan 2')).toBeInTheDocument();

      await user.keyboard('{ArrowRight}');

      expect(component.getByText('Jan 2')).toBeInTheDocument();
    });

    test('does not step before the earliest day (clamped to range)', async () => {
      const user = userEvent.setup();
      const component = renderWithProps({}, [
        '/?modal=daily-stats&date=2026-01-01',
      ]);
      expect(component.getByText('Jan 1')).toBeInTheDocument();

      await user.keyboard('{ArrowLeft}');

      expect(component.getByText('Jan 1')).toBeInTheDocument();
    });

    test('ignores arrow keys when the modal is closed', async () => {
      const user = userEvent.setup();
      const component = renderWithProps({}, ['/']);

      await user.keyboard('{ArrowRight}');

      expect(
        component.queryByRole('heading', {
          name: DAILY_STATS_MODAL_COPY.title,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when there are no daily stats', () => {
    test('renders the empty description', () => {
      const component = renderWithProps({ dailyStats: [] }, [
        '/?modal=daily-stats',
      ]);
      expect(
        component.getByText(DAILY_STATS_MODAL_COPY.emptyDescription),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('daily-stats-detail'),
      ).not.toBeInTheDocument();
    });
  });
});
