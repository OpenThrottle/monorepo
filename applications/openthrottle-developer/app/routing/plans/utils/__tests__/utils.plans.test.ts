import { describe, expect, test } from 'vitest';
import { getPlanIsCancelable, getPlanIsRunning } from '../utils.plans';

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

  describe('getPlanIsRunning', () => {
    test.each([
      ['QUEUED', true],
      ['IN_PROGRESS', true],
      ['PENDING', false],
      ['COMPLETED', false],
      ['SKIPPED', false],
      ['BLOCKED', false],
      ['BACKLOG', false],
      ['CANCELED', false],
      ['', false],
    ] as const)('status %s -> running: %s', (status, expected) => {
      expect(getPlanIsRunning(status)).toBe(expected);
    });

    test('returns false when status is null or undefined', () => {
      expect(getPlanIsRunning(null)).toBe(false);
      expect(getPlanIsRunning(undefined)).toBe(false);
    });

    test('matches getPlanIsCancelable across every status', () => {
      for (const status of [
        'QUEUED',
        'IN_PROGRESS',
        'PENDING',
        'COMPLETED',
        'SKIPPED',
        'BLOCKED',
        'BACKLOG',
        'CANCELED',
        '',
        null,
        undefined,
      ] as const) {
        expect(getPlanIsRunning(status)).toBe(getPlanIsCancelable(status));
      }
    });
  });
});
