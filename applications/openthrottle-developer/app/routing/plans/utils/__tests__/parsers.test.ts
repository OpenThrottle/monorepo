import { describe, expect, test } from 'vitest';
import {
  PLANS_DETAIL_TAB_SEARCH_PARAM,
  buildStatusFilterUrls,
  parseAssigneesFromSearchParams,
  parsePlanDetailTab,
} from '../parsers';

describe('routing/plans/utils/parsers', () => {
  describe('parseAssigneesFromSearchParams', () => {
    test('collects repeated and comma-separated values, trimmed and de-blanked', () => {
      const params = new URLSearchParams(
        'assignee=alice&assignee=%20bob%20,carol&assignee=,',
      );
      expect(parseAssigneesFromSearchParams(params)).toEqual([
        'alice',
        'bob',
        'carol',
      ]);
    });

    test('returns an empty array when no assignee param is present', () => {
      expect(parseAssigneesFromSearchParams(new URLSearchParams())).toEqual([]);
    });
  });

  describe('buildStatusFilterUrls', () => {
    test('emits one /plans link per status option, resetting to page 1', () => {
      const urls = buildStatusFilterUrls(new URLSearchParams('page=4'));
      const values = Object.values(urls);
      expect(values.length).toBeGreaterThan(0);
      for (const url of values) {
        expect(url.startsWith('/plans?')).toBe(true);
        expect(url).toContain('page=1');
        expect(url).toContain('status=');
      }
    });
  });

  describe('parsePlanDetailTab', () => {
    test.each([
      [null, null],
      ['', null],
      ['bogus', null],
      ['overview', 'overview'],
      ['tasks', 'tasks'],
      ['requirements', 'requirements'],
      ['configuration', 'configuration'],
      ['metadata', 'metadata'],
    ] as const)('parsePlanDetailTab(%s) -> %s', (raw, expected) => {
      expect(parsePlanDetailTab(raw)).toBe(expected);
    });

    test('search param key is stable for docs and routes', () => {
      expect(PLANS_DETAIL_TAB_SEARCH_PARAM).toBe('tab');
    });
  });
});
