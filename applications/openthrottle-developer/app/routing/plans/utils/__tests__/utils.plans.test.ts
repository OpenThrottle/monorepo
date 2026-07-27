import { describe, expect, test } from 'vitest';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import {
  getPlanIsCancelable,
  getPlanIsRunning,
  getResolvedTaskCount,
} from '../utils.plans';

const taskWithStatus = (status: string): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: `task-${status}`,
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status,
  summary: null,
  title: `Task ${status}`,
  updatedAt: '2025-01-02T00:00:00Z',
});

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

  describe('getResolvedTaskCount', () => {
    test.each([
      ['COMPLETED', 1],
      ['SKIPPED', 1],
      ['PENDING', 0],
      ['IN_PROGRESS', 0],
      ['BLOCKED', 0],
      ['QUEUED', 0],
      ['BACKLOG', 0],
      ['CANCELED', 0],
    ] as const)('a single %s task contributes %d', (status, expected) => {
      expect(getResolvedTaskCount([taskWithStatus(status)])).toBe(expected);
    });

    test('counts COMPLETED and SKIPPED together, ignoring open work', () => {
      const tasks = [
        taskWithStatus('COMPLETED'),
        taskWithStatus('SKIPPED'),
        taskWithStatus('PENDING'),
        taskWithStatus('IN_PROGRESS'),
        taskWithStatus('BLOCKED'),
        taskWithStatus('CANCELED'),
      ];

      // Matches plan b1524f1d: 6 tasks, 2 resolved (1 completed-equivalent +
      // 1 skipped) -> the Tasks tab reads 2/6.
      expect(getResolvedTaskCount(tasks)).toBe(2);
    });

    test('an empty task list resolves to zero', () => {
      expect(getResolvedTaskCount([])).toBe(0);
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
