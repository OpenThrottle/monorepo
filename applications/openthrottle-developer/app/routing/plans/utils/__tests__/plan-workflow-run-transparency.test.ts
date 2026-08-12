import { describe, expect, test } from 'vitest';
import { formatFinishedOn } from '../plan-workflow-run-transparency';

describe('formatFinishedOn', () => {
  test('returns an em dash for null', () => {
    expect(formatFinishedOn(null)).toBe('—');
  });

  test('returns an em dash for undefined', () => {
    expect(formatFinishedOn(undefined)).toBe('—');
  });

  test('returns an em dash for NaN', () => {
    expect(formatFinishedOn(Number.NaN)).toBe('—');
  });

  test('formats a finishedOn epoch millisecond value as an ISO timestamp', () => {
    const finishedOn = Date.UTC(2026, 2, 14, 12, 0, 0);
    expect(formatFinishedOn(finishedOn)).toBe(
      new Date(finishedOn).toISOString(),
    );
  });

  test('formats zero as an ISO timestamp rather than treating it as absent', () => {
    expect(formatFinishedOn(0)).toBe(new Date(0).toISOString());
  });
});
