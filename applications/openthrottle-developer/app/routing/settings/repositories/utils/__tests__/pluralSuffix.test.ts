import { describe, expect, test } from 'vitest';

import { pluralSuffix } from '../pluralSuffix';

describe('pluralSuffix', () => {
  test('uses the singular copy for exactly one', () => {
    expect(pluralSuffix(1, 'root', 'roots')).toBe('root');
  });

  test('uses the plural copy for zero and for many', () => {
    expect(pluralSuffix(0, 'root', 'roots')).toBe('roots');
    expect(pluralSuffix(3, 'root', 'roots')).toBe('roots');
  });
});
