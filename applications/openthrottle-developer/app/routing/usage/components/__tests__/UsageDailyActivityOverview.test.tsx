import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  USAGE_COMPLETION_ATTRIBUTION_CAVEAT,
  USAGE_DAILY_STATS_SERIES,
} from '~/routing/usage/data/daily-stats-series-glossary';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageDailyActivityOverview } from '../UsageDailyActivityOverview';

describe('UsageDailyActivityOverview Component', () => {
  test('renders chart scope copy with rangeDays', () => {
    renderRoutesStub(<UsageDailyActivityOverview rangeDays={7} />);

    expect(
      screen.getByRole('heading', { name: 'What this chart includes' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/last 7 days/i)).toBeInTheDocument();
    expect(
      screen.getByText(/OpenThrottle plan and task activity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(USAGE_COMPLETION_ATTRIBUTION_CAVEAT),
    ).toBeInTheDocument();
  });

  test('lists each daily stats series label from the glossary', () => {
    renderRoutesStub(<UsageDailyActivityOverview rangeDays={30} />);

    for (const row of USAGE_DAILY_STATS_SERIES) {
      expect(screen.getByText(row.label)).toBeInTheDocument();
    }
  });
});
