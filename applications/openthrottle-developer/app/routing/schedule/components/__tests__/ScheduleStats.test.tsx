import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { ScheduleStats } from '../ScheduleStats';
import type { ScheduleStatsProps } from '../ScheduleStats';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';

const renderStats = (
  overrides: Partial<ScheduleStatsProps> = {},
): RenderResult => {
  const props: ScheduleStatsProps = {
    enabledCount: 0,
    failedCount: 0,
    queuedCount: 0,
    ranCount: 0,
    runningCount: 0,
    succeededCount: 0,
    totalCount: 0,
    ...overrides,
  };

  const Component = () => <ScheduleStats {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('ScheduleStats Component', () => {
  test('renders a tile per stat, titled from the shared copy', () => {
    const component = renderStats();

    expect(component.getByTestId('ScheduleStats')).toBeInTheDocument();
    expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(4);
    for (const title of [
      SCHEDULE_COPY.statEnabledTitle,
      SCHEDULE_COPY.statFailedTitle,
      SCHEDULE_COPY.statInFlightTitle,
      SCHEDULE_COPY.statRanTodayTitle,
    ]) {
      expect(component.getByText(title)).toBeInTheDocument();
    }
  });

  test('renders the zero state as zeroes rather than blanks', () => {
    const component = renderStats();

    // Four values + three sub-values, every one of them a rendered 0.
    expect(component.getAllByText('0')).toHaveLength(7);
  });

  test('renders the counts it is given', () => {
    const component = renderStats({
      enabledCount: 5,
      failedCount: 2,
      queuedCount: 3,
      ranCount: 12,
      runningCount: 4,
      succeededCount: 9,
      totalCount: 7,
    });

    for (const count of ['2', '3', '4', '5', '7', '9', '12']) {
      expect(component.getByText(count)).toBeInTheDocument();
    }
  });

  test('formats large counts with thousands separators', () => {
    const component = renderStats({ ranCount: 1234 });

    expect(component.getByText('1,234')).toBeInTheDocument();
  });
});
