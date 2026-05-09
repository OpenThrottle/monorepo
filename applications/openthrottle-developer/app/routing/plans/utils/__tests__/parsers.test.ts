import { describe, expect, test } from 'vitest';
import { PLANS_DETAIL_TAB_SEARCH_PARAM, parsePlanDetailTab } from '../parsers';

describe('routing/plans/utils/parsers', () => {
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
      expect(PLANS_DETAIL_TAB_SEARCH_PARAM).toBe('plansDetailTab');
    });
  });
});
