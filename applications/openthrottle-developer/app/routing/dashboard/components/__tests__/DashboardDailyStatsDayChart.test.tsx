import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DashboardDailyStatsDayChart } from '../DashboardDailyStatsDayChart';
import type { DailyStatsChartDatum } from '../DashboardDailyStatsCard';

const datum: DailyStatsChartDatum = {
  date: '2026-01-01',
  plansCompleted: 1,
  plansCreated: 2,
  plansUpdated: 0,
  tasksCompleted: 1,
  tasksCreated: 3,
  tasksUpdated: 1,
};

describe('DashboardDailyStatsDayChart Component', () => {
  // Recharts draws no geometry under jsdom's zero-size ResizeObserver, so assert the
  // chart mounts (wrapper testid + chart container) rather than recharts-rendered ticks.
  test('mounts the chart for the given day', () => {
    const component = render(<DashboardDailyStatsDayChart datum={datum} />);
    const wrapper = component.getByTestId('DashboardDailyStatsDayChart');
    expect(wrapper).toBeInTheDocument();
    expect(
      wrapper.querySelector('.recharts-responsive-container'),
    ).not.toBeNull();
  });
});
