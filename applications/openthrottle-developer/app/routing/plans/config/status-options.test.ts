import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PLAN_STATUS,
  DEFAULT_STATUSES,
  PLAN_STATUS_FILTER_OPTIONS,
  isPlanStatusFilterValue,
  parseStatusFromSearchParams,
  parseStatusesFromSearchParams,
} from './status-options';

describe('status-options constants', () => {
  test('every filter option carries a canonical value and a label', () => {
    expect(PLAN_STATUS_FILTER_OPTIONS.length).toBeGreaterThan(0);
    for (const option of PLAN_STATUS_FILTER_OPTIONS) {
      expect(isPlanStatusFilterValue(option.value)).toBe(true);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isPlanStatusFilterValue', () => {
  test('accepts canonical statuses and rejects junk', () => {
    expect(isPlanStatusFilterValue('IN_PROGRESS')).toBe(true);
    expect(isPlanStatusFilterValue('in_progress')).toBe(false);
    expect(isPlanStatusFilterValue('NOPE')).toBe(false);
  });
});

describe('parseStatusFromSearchParams', () => {
  test('returns the upper-cased status when valid', () => {
    expect(
      parseStatusFromSearchParams(new URLSearchParams('status=in_progress')),
    ).toBe('IN_PROGRESS');
  });

  test('falls back to the default when missing or invalid', () => {
    expect(parseStatusFromSearchParams(new URLSearchParams())).toBe(
      DEFAULT_PLAN_STATUS,
    );
    expect(
      parseStatusFromSearchParams(new URLSearchParams('status=bogus')),
    ).toBe(DEFAULT_PLAN_STATUS);
  });
});

describe('parseStatusesFromSearchParams', () => {
  test('splits repeated and comma-separated statuses, dropping invalid', () => {
    expect(
      parseStatusesFromSearchParams(
        new URLSearchParams('status=pending,bogus&status=in_progress'),
      ),
    ).toEqual(['PENDING', 'IN_PROGRESS']);
  });

  test('defaults to DEFAULT_STATUSES when none are valid', () => {
    expect(
      parseStatusesFromSearchParams(new URLSearchParams('status=nope')),
    ).toEqual([...DEFAULT_STATUSES]);
  });
});
