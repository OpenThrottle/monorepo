import { describe, expect, test } from 'vitest';
import { buildSearchUrl, parseSearchParams } from '../parsers';

describe('parseSearchParams', () => {
  test('should set expandRankingDetails when details=ranking', () => {
    const params = new URLSearchParams('q=foo&details=ranking');
    expect(parseSearchParams(params).expandRankingDetails).toBe(true);
  });

  test('should not set expandRankingDetails for other details values', () => {
    const params = new URLSearchParams('q=foo&details=other');
    expect(parseSearchParams(params).expandRankingDetails).toBe(false);
  });
});

describe('buildSearchUrl', () => {
  test('should include details=ranking when options ask for it', () => {
    const url = buildSearchUrl('x', 1, 10, { detailsRanking: true });
    expect(url).toContain('details=ranking');
    expect(url).toContain('q=x');
  });
});
