import { describe, expect, it } from 'vitest';

import { isRecord } from '../is-record.ts';

// Merge-queue e2e probe (plan 491c0f49). Safe to revert after task a09527fa.
// Merge-queue negative-case setup (task a09527fa) — next push will fail CI.

describe('isRecord', () => {
  it('intentionally fails so the merge queue rejects this PR', () => {
    expect(true).toBe(false);
  });

  it('accepts plain objects, including empty ones', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ id: 'x' })).toBe(true);
    expect(isRecord({ nested: { count: 1 } })).toBe(true);
  });

  it('rejects null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it('rejects arrays, including empty ones', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isRecord('a string')).toBe(false);
    expect(isRecord(7)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });

  it('rejects functions', () => {
    expect(isRecord(() => undefined)).toBe(false);
    expect(isRecord(function named() {})).toBe(false);
  });

  it('narrows to Record<string, unknown> for safe property access', () => {
    const value: unknown = { date: '2024-01-01', total: 3 };

    if (isRecord(value)) {
      expect(value.date).toBe('2024-01-01');
      expect(value.total).toBe(3);
    } else {
      throw new Error('expected value to be narrowed as a record');
    }
  });
});
