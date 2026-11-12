import { describe, expect, test } from 'vitest';

import { splitCommaLabels } from '../splitCommaLabels';

describe('splitCommaLabels', () => {
  test('trims labels and drops empty ones', () => {
    expect(splitCommaLabels(' a, b ,, c ,')).toEqual(['a', 'b', 'c']);
  });

  test('returns no labels for a non-string value', () => {
    expect(splitCommaLabels(undefined)).toEqual([]);
    expect(splitCommaLabels(42)).toEqual([]);
  });
});
