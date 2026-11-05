import { describe, expect, test } from 'vitest';

import { mergedFilterValue } from '../merged-filter-value';

describe('mergedFilterValue', () => {
  test('maps true to the merged-only value', () => {
    expect(mergedFilterValue(true)).toBe('true');
  });

  test('maps false to the not-merged value', () => {
    expect(mergedFilterValue(false)).toBe('false');
  });

  test('maps null and undefined to any', () => {
    expect(mergedFilterValue(null)).toBe('');
    expect(mergedFilterValue(undefined)).toBe('');
  });
});
