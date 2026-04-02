import { describe, expect, test } from 'vitest';
import { shouldOfferKillPlanRun } from '../should-offer-kill-plan-run';

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
    expect(shouldOfferKillPlanRun(status)).toBe(expected);
  });

  test('returns false when status is null or undefined', () => {
    expect(shouldOfferKillPlanRun(null)).toBe(false);
    expect(shouldOfferKillPlanRun(undefined)).toBe(false);
  });
});
