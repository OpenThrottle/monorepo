import { describe, expect, test } from 'vitest';
import { formatLocationLabel } from '../formatLocationLabel';

describe('formatLocationLabel', () => {
  test('omits the column when not given', () => {
    expect(formatLocationLabel({ line: 12, path: 'src/a.ts' })).toBe(
      'src/a.ts:12',
    );
  });

  test('includes the column when given', () => {
    expect(formatLocationLabel({ column: 4, line: 12, path: 'src/a.ts' })).toBe(
      'src/a.ts:12:4',
    );
  });

  test('includes a zero column (not treated as absent)', () => {
    expect(formatLocationLabel({ column: 0, line: 12, path: 'src/a.ts' })).toBe(
      'src/a.ts:12:0',
    );
  });
});
