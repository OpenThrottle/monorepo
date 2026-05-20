import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  QUEUE_STATS_CHART_FINALIST_IDS,
  QUEUE_STATS_CHART_OPERATIONAL_SERIES,
  QUEUE_STATS_CHART_RECOMMENDED_FINALIST,
  QUEUE_STATS_CHART_SUCCESS_CRITERIA,
  QUEUE_STATS_CHART_VIEW_OPTIONS,
  REPRESENTATIVE_SKEWED_QUEUES,
  analyzeQueuesChartSkew,
  backlogForQueue,
  queuesToStatsChartData,
  seriesKeysForQueueStatsView,
} from '../queue-stats-chart';

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

describe('backlogForQueue', () => {
  test('sums waiting and delayed counts', () => {
    expect(
      backlogForQueue(
        queue({ delayedCount: 3, name: 'alpha', waitingCount: 5 }),
      ),
    ).toBe(8);
  });

  test('returns zero when both counts are zero', () => {
    expect(backlogForQueue(queue({ name: 'idle' }))).toBe(0);
  });
});

describe('queuesToStatsChartData', () => {
  test('returns empty array when queues is empty', () => {
    expect(queuesToStatsChartData([])).toEqual([]);
  });

  test('maps each queue to all count series', () => {
    const queues = [
      queue({
        activeCount: 2,
        completedCount: 100,
        delayedCount: 1,
        failedCount: 3,
        name: 'default',
        waitingCount: 5,
      }),
      queue({ name: 'notifications' }),
    ];

    expect(queuesToStatsChartData(queues)).toEqual([
      {
        active: 2,
        completed: 100,
        delayed: 1,
        failed: 3,
        name: 'default',
        waiting: 5,
      },
      {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        name: 'notifications',
        waiting: 0,
      },
    ]);
  });

  test('sorts by total jobs descending, then name ascending', () => {
    const queues = [
      queue({ completedCount: 1, name: 'z-queue' }),
      queue({ completedCount: 50, name: 'a-queue' }),
      queue({ completedCount: 10, name: 'm-queue', waitingCount: 5 }),
    ];

    expect(queuesToStatsChartData(queues).map((row) => row.name)).toEqual([
      'a-queue',
      'm-queue',
      'z-queue',
    ]);
  });

  test('does not mutate the input array', () => {
    const queues = [
      queue({ name: 'b', waitingCount: 1 }),
      queue({ name: 'a', waitingCount: 2 }),
    ];
    const copy = [...queues];

    queuesToStatsChartData(queues);

    expect(queues).toEqual(copy);
  });
});

describe('analyzeQueuesChartSkew', () => {
  test('documents representative skew: plans completed drives shared X scale', () => {
    const analysis = analyzeQueuesChartSkew(REPRESENTATIVE_SKEWED_QUEUES);

    expect(analysis.dominantQueue).toBe('plans');
    expect(analysis.dominantSeries).toBe('completed');
    expect(analysis.dominantSeriesValue).toBe(48_200);
    expect(analysis.maxSingleSeries).toBe(48_200);
    expect(analysis.nonDominantBacklogMax).toBe(26);
    expect(analysis.nonDominantBacklogToAxisRatio).toBeCloseTo(26 / 48_200, 5);
  });

  test('exposes backlog per queue for cross-queue comparison goals', () => {
    const analysis = analyzeQueuesChartSkew(REPRESENTATIVE_SKEWED_QUEUES);

    expect(analysis.backlogByQueue).toEqual([
      { backlog: 0, name: 'plans' },
      { backlog: 26, name: 'embeddings-ingest' },
      { backlog: 13, name: 'default' },
    ]);
  });
});

describe('QUEUE_STATS_CHART_SUCCESS_CRITERIA', () => {
  test('defines at least three measurable chart redesign goals', () => {
    expect(QUEUE_STATS_CHART_SUCCESS_CRITERIA.length).toBeGreaterThanOrEqual(3);
    expect(QUEUE_STATS_CHART_SUCCESS_CRITERIA.join(' ')).toMatch(/backlog/i);
    expect(QUEUE_STATS_CHART_SUCCESS_CRITERIA.join(' ')).toMatch(/tooltip/i);
  });
});

describe('QUEUE_STATS_CHART_VIEW_OPTIONS', () => {
  test('documents two finalists that meet all success criteria', () => {
    const finalists = QUEUE_STATS_CHART_VIEW_OPTIONS.filter(
      (option) => option.verdict === 'finalist',
    );

    expect(finalists.map((option) => option.id)).toEqual([
      ...QUEUE_STATS_CHART_FINALIST_IDS,
    ]);

    for (const option of finalists) {
      expect(option.meetsSuccessCriteria.backlogReadable).toBe(true);
      expect(option.meetsSuccessCriteria.crossQueueComparable).toBe(true);
      expect(option.meetsSuccessCriteria.tooltipParity).toBe(true);
    }
  });

  test('rejects log scale and percent stacked for cross-queue backlog goals', () => {
    const rejectedIds = ['log-scale-all-series', 'percent-stacked'] as const;

    for (const id of rejectedIds) {
      const option = QUEUE_STATS_CHART_VIEW_OPTIONS.find((o) => o.id === id);
      expect(option?.verdict).toBe('rejected');
      expect(option?.meetsSuccessCriteria.crossQueueComparable).toBe(false);
    }
  });

  test('recommends operational default toggle for spike', () => {
    expect(QUEUE_STATS_CHART_RECOMMENDED_FINALIST).toBe(
      'operational-default-with-completed-toggle',
    );
  });
});

describe('seriesKeysForQueueStatsView', () => {
  test('operational view omits completed', () => {
    expect(seriesKeysForQueueStatsView(false)).toEqual([
      ...QUEUE_STATS_CHART_OPERATIONAL_SERIES,
    ]);
    expect(seriesKeysForQueueStatsView(false)).not.toContain('completed');
  });

  test('full view includes all five table series', () => {
    expect(seriesKeysForQueueStatsView(true)).toHaveLength(5);
    expect(seriesKeysForQueueStatsView(true)).toContain('completed');
  });
});
