import { describe, expect, test } from 'vitest';
import { getPlanIsCancelable } from '../utils.plans';

describe('utils.plans', () => {
  describe('shouldOfferKillPlanRun', () => {
    test.each([
      ['QUEUED', true],
      ['IN_PROGRESS', true],
      ['PENDING', false],
      ['COMPLETED', false],
      ['SKIPPED', false],
      ['BLOCKED', false],
      ['', false],
    ] as const)('status %s -> offer kill: %s', (status, expected) => {
      expect(getPlanIsCancelable(status)).toBe(expected);
    });

    test('returns false when status is null or undefined', () => {
      expect(getPlanIsCancelable(null)).toBe(false);
      expect(getPlanIsCancelable(undefined)).toBe(false);
    });
  });
});
