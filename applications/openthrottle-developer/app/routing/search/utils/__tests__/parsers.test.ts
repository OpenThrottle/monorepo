import { describe, expect, test } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  SEARCH_BASE_PATH,
} from '~/routing/search/config';
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

  test('should parse q, page, and limit with defaults', () => {
    const params = new URLSearchParams('');
    expect(parseSearchParams(params)).toEqual({
      expandRankingDetails: false,
      limit: DEFAULT_SEARCH_LIMIT,
      page: 1,
      q: '',
    });
  });

  test('should clamp page to at least 1 for invalid page', () => {
    expect(parseSearchParams(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseSearchParams(new URLSearchParams('page=abc')).page).toBe(1);
  });

  test('should treat limit=0 as invalid and use default limit', () => {
    expect(parseSearchParams(new URLSearchParams('limit=0')).limit).toBe(
      DEFAULT_SEARCH_LIMIT,
    );
  });

  test('should clamp limit to at most 100', () => {
    expect(parseSearchParams(new URLSearchParams('limit=500')).limit).toBe(100);
  });

  test('should use default limit when limit param is not a number', () => {
    expect(parseSearchParams(new URLSearchParams('limit=bad')).limit).toBe(
      DEFAULT_SEARCH_LIMIT,
    );
  });
});

describe('buildSearchUrl', () => {
  test('should include details=ranking when options ask for it', () => {
    const url = buildSearchUrl('x', 1, 10, { detailsRanking: true });
    expect(url).toContain('details=ranking');
    expect(url).toContain('q=x');
  });

  test('should return base path only when q is empty and page is default', () => {
    expect(buildSearchUrl('', 1, DEFAULT_SEARCH_LIMIT)).toBe(SEARCH_BASE_PATH);
  });

  test('should omit limit from query when it matches default', () => {
    const url = buildSearchUrl('hello', 1, DEFAULT_SEARCH_LIMIT);
    expect(url).toBe(`${SEARCH_BASE_PATH}?q=hello`);
    expect(url).not.toContain('limit=');
  });

  test('should include page when greater than 1', () => {
    expect(buildSearchUrl('a', 3, 10)).toContain('page=3');
  });
});
