import { describe, expect, test } from 'vitest';
import { formatRankSummary } from './search-why-this-result';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';

describe('formatRankSummary', () => {
  test('summarizes global index, page, and within-page position', () => {
    const meta: SearchRankMeta = {
      indexOnPage: 2,
      page: 3,
      pageSize: 10,
      total: 42,
    };

    expect(formatRankSummary(meta)).toBe(
      'Result 23 of 42 (page 3, position 3 of 10 on this page). Ordering is by embedding similarity, not keyword match.',
    );
  });

  test('computes the global index for the first result on the first page', () => {
    const meta: SearchRankMeta = {
      indexOnPage: 0,
      page: 1,
      pageSize: 20,
      total: 100,
    };

    expect(formatRankSummary(meta)).toBe(
      'Result 1 of 100 (page 1, position 1 of 20 on this page). Ordering is by embedding similarity, not keyword match.',
    );
  });
});
