import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  USAGE_COMPLETION_ATTRIBUTION_CAVEAT,
  USAGE_DAILY_STATS_SERIES,
} from '~/routing/usage/data/data.daily-stats-series-glossary';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { UsageDailyActivityOverview } from '../UsageDailyActivityOverview';

describe('UsageDailyActivityOverview Component', () => {
  test('renders chart scope copy with rangeDays', () => {
    const component = renderRoutesStub(
      <UsageDailyActivityOverview rangeDays={7} />,
    );

    expect(
      component.getByRole('heading', { name: 'What this chart includes' }),
    ).toBeInTheDocument();
    expect(component.getByText(/last 7 days/i)).toBeInTheDocument();
    expect(
      component.getByText(/OpenThrottle plan and task activity/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(USAGE_COMPLETION_ATTRIBUTION_CAVEAT),
    ).toBeInTheDocument();
  });

  test('lists each daily stats series label from the glossary', () => {
    const component = renderRoutesStub(
      <UsageDailyActivityOverview rangeDays={30} />,
    );

    for (const row of USAGE_DAILY_STATS_SERIES) {
      expect(component.getByText(row.label)).toBeInTheDocument();
    }
  });
});
