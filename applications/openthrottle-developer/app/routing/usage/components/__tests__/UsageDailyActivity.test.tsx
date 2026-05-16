import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UsageDailyActivity } from '../UsageDailyActivity';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const sampleDailyStats: ReadonlyArray<DashboardDailyStatsCardFragment> = [
  {
    date: '2026-01-01',
    plansCompleted: 1,
    plansCreated: 0,
    plansUpdated: 0,
    tasksCompleted: 2,
    tasksCreated: 0,
    tasksUpdated: 1,
  },
];

describe('UsageDailyActivity Component', () => {
  test('renders daily activity section and chart card', () => {
    renderRoutesStub(
      <UsageDailyActivity dailyStats={sampleDailyStats} rangeDays={30} />,
    );

    expect(screen.getByTestId('UsageDailyActivity')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Daily activity' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('DashboardDailyStatsCard')).toBeInTheDocument();
  });

  test('renders series overview for the same rangeDays', () => {
    renderRoutesStub(
      <UsageDailyActivity dailyStats={sampleDailyStats} rangeDays={30} />,
    );

    expect(
      screen.getByRole('heading', { name: 'What this chart includes' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/last 30 days/i)).toBeInTheDocument();
  });
});
