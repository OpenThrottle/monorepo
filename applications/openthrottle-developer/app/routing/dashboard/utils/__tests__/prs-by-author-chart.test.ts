import { describe, expect, test } from 'vitest';
import {
  PRS_BY_AUTHOR_CHART_CONFIG,
  PRS_BY_AUTHOR_CHART_SERIES,
  prsByAuthorToChartData,
} from '../prs-by-author-chart';

describe('PRS_BY_AUTHOR_CHART_SERIES', () => {
  test('defines open and closed keys for grouped bars', () => {
    expect([...PRS_BY_AUTHOR_CHART_SERIES]).toEqual(['closed', 'open']);
  });
});

describe('PRS_BY_AUTHOR_CHART_CONFIG', () => {
  test('labels open and closed for legend and tooltips', () => {
    expect(PRS_BY_AUTHOR_CHART_CONFIG.open?.label).toBe('Open');
    expect(PRS_BY_AUTHOR_CHART_CONFIG.closed?.label).toBe('Closed');
  });
});

describe('prsByAuthorToChartData', () => {
  test('returns empty array when both series are empty', () => {
    expect(prsByAuthorToChartData([], [])).toEqual([]);
  });

  test('merges authors from open and closed into one row per author', () => {
    expect(
      prsByAuthorToChartData(
        [{ author: 'visormatt', openCount: 5 }],
        [{ author: 'visormatt', openCount: 1 }],
      ),
    ).toEqual([{ author: 'visormatt', closed: 1, open: 5 }]);
  });

  test('fills zero for a series when author appears only in the other', () => {
    expect(
      prsByAuthorToChartData(
        [{ author: 'open-only', openCount: 2 }],
        [{ author: 'closed-only', openCount: 3 }],
      ),
    ).toEqual([
      { author: 'closed-only', closed: 3, open: 0 },
      { author: 'open-only', closed: 0, open: 2 },
    ]);
  });

  test('sorts by total PRs descending, then author name ascending', () => {
    expect(
      prsByAuthorToChartData(
        [
          { author: 'z-user', openCount: 1 },
          { author: 'a-user', openCount: 10 },
          { author: 'm-user', openCount: 2 },
        ],
        [
          { author: 'z-user', openCount: 0 },
          { author: 'a-user', openCount: 0 },
          { author: 'm-user', openCount: 5 },
        ],
      ).map((row) => row.author),
    ).toEqual(['a-user', 'm-user', 'z-user']);
  });

  test('does not mutate input arrays', () => {
    const open = [{ author: 'a', openCount: 1 }];
    const closed = [{ author: 'b', openCount: 2 }];
    const openCopy = [...open];
    const closedCopy = [...closed];

    prsByAuthorToChartData(open, closed);

    expect(open).toEqual(openCopy);
    expect(closed).toEqual(closedCopy);
  });
});
