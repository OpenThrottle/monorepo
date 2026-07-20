import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  formatQueueStateChartTick,
  isQueueStateChartView,
  QUEUE_STATE_CHART_AGGREGATE_LABEL,
  QUEUE_STATE_CHART_CONFIG,
  QUEUE_STATE_CHART_MIN_HEIGHT,
  QUEUE_STATE_CHART_SERIES,
  QUEUE_STATE_CHART_VIEWS,
  queuesToAggregateStateDatum,
  queuesToPerQueueStateData,
  queueStateChartData,
  queueStateChartHeight,
  totalJobsForStateRow,
} from '../queue-state-chart';

const queue = (
  overrides: Partial<QueueCardFragment> & Pick<QueueCardFragment, 'name'>,
): QueueCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 0,
  completedCount: 0,
  delayedCount: 0,
  failedCount: 0,
  waitingCount: 0,
  ...overrides,
});

describe('QUEUE_STATE_CHART_CONFIG', () => {
  test('maps every series to a colour and label', () => {
    for (const seriesKey of QUEUE_STATE_CHART_SERIES) {
      expect(QUEUE_STATE_CHART_CONFIG[seriesKey]?.color).toMatch(
        /var\(--chart-\d\)/,
      );
      expect(QUEUE_STATE_CHART_CONFIG[seriesKey]?.label).toBeTruthy();
    }
  });

  test('keeps the stats chart mapping (active labelled "In flight")', () => {
    expect(QUEUE_STATE_CHART_CONFIG.active?.label).toBe('In flight');
  });
});

describe('isQueueStateChartView', () => {
  test('accepts known view modes and rejects others', () => {
    expect(isQueueStateChartView('aggregate')).toBe(true);
    expect(isQueueStateChartView('byQueue')).toBe(true);
    expect(isQueueStateChartView('')).toBe(false);
    expect(isQueueStateChartView('nope')).toBe(false);
  });
});

describe('queuesToAggregateStateDatum', () => {
  test('sums each state across all queues into one row', () => {
    const queues = [
      queue({
        activeCount: 2,
        completedCount: 100,
        delayedCount: 1,
        failedCount: 3,
        name: 'default',
        waitingCount: 5,
      }),
      queue({
        activeCount: 1,
        completedCount: 40,
        delayedCount: 4,
        failedCount: 0,
        name: 'notifications',
        waitingCount: 7,
      }),
    ];

    expect(queuesToAggregateStateDatum(queues)).toEqual({
      active: 3,
      completed: 140,
      delayed: 5,
      failed: 3,
      name: QUEUE_STATE_CHART_AGGREGATE_LABEL,
      waiting: 12,
    });
  });

  test('returns a zeroed labelled row when there are no queues', () => {
    expect(queuesToAggregateStateDatum([])).toEqual({
      active: 0,
      completed: 0,
      delayed: 0,
      failed: 0,
      name: QUEUE_STATE_CHART_AGGREGATE_LABEL,
      waiting: 0,
    });
  });
});

describe('queuesToPerQueueStateData', () => {
  test('returns empty array when queues is empty', () => {
    expect(queuesToPerQueueStateData([])).toEqual([]);
  });

  test('maps each queue to a row with all five state counts', () => {
    const queues = [
      queue({
        activeCount: 2,
        completedCount: 100,
        delayedCount: 1,
        failedCount: 3,
        name: 'default',
        waitingCount: 5,
      }),
    ];

    expect(queuesToPerQueueStateData(queues)).toEqual([
      {
        active: 2,
        completed: 100,
        delayed: 1,
        failed: 3,
        name: 'default',
        waiting: 5,
      },
    ]);
  });

  test('sorts by total jobs descending then name ascending', () => {
    const queues = [
      queue({ completedCount: 1, name: 'z-queue' }),
      queue({ completedCount: 50, name: 'a-queue' }),
      queue({ completedCount: 10, name: 'm-queue', waitingCount: 5 }),
    ];

    expect(queuesToPerQueueStateData(queues).map((row) => row.name)).toEqual([
      'a-queue',
      'm-queue',
      'z-queue',
    ]);
  });

  test('breaks total ties by name ascending', () => {
    const queues = [
      queue({ name: 'beta', waitingCount: 4 }),
      queue({ name: 'alpha', waitingCount: 4 }),
    ];

    expect(queuesToPerQueueStateData(queues).map((row) => row.name)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  test('does not mutate the input array', () => {
    const queues = [
      queue({ name: 'b', waitingCount: 1 }),
      queue({ name: 'a', waitingCount: 2 }),
    ];
    const copy = [...queues];

    queuesToPerQueueStateData(queues);

    expect(queues).toEqual(copy);
  });
});

describe('queueStateChartData', () => {
  const queues = [
    queue({ completedCount: 10, name: 'default', waitingCount: 2 }),
    queue({ activeCount: 1, name: 'notifications' }),
  ];

  test('aggregate view returns a single summed row', () => {
    const data = queueStateChartData('aggregate', queues);

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(queuesToAggregateStateDatum(queues));
  });

  test('byQueue view returns one sorted row per queue', () => {
    expect(queueStateChartData('byQueue', queues)).toEqual(
      queuesToPerQueueStateData(queues),
    );
  });

  test('aggregate view still returns one row when queues is empty', () => {
    expect(queueStateChartData('aggregate', [])).toHaveLength(1);
    expect(queueStateChartData('byQueue', [])).toEqual([]);
  });
});

describe('totalJobsForStateRow', () => {
  test('sums all five state counts', () => {
    expect(
      totalJobsForStateRow({
        active: 1,
        completed: 2,
        delayed: 3,
        failed: 4,
        name: 'x',
        waiting: 5,
      }),
    ).toBe(15);
  });
});

describe('queueStateChartHeight', () => {
  test('returns minimum height for a single (aggregate) bar', () => {
    expect(queueStateChartHeight(0)).toBe(QUEUE_STATE_CHART_MIN_HEIGHT);
    expect(queueStateChartHeight(1)).toBe(QUEUE_STATE_CHART_MIN_HEIGHT);
  });

  test('grows with bar count above the minimum', () => {
    expect(queueStateChartHeight(20)).toBeGreaterThan(
      QUEUE_STATE_CHART_MIN_HEIGHT,
    );
  });
});

describe('formatQueueStateChartTick', () => {
  test('formats large job counts compactly', () => {
    expect(formatQueueStateChartTick(48_200)).toBe('48.2K');
    expect(formatQueueStateChartTick(26)).toBe('26');
  });

  test('passes through non-finite values as strings', () => {
    expect(formatQueueStateChartTick(Number.NaN)).toBe('NaN');
  });
});

describe('QUEUE_STATE_CHART_VIEWS', () => {
  test('defines exactly the aggregate and byQueue modes', () => {
    expect([...QUEUE_STATE_CHART_VIEWS]).toEqual(['aggregate', 'byQueue']);
  });
});
