import { describe, expect, test } from 'vitest';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';

import {
  getPlanIsCancelable,
  getPlanIsRunning,
  getPlanIsTerminal,
  getPlanStatusBadgeColor,
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
      ['PROMOTED', false],
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
      ['PROMOTED', 1],
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

    test('counts COMPLETED, PROMOTED and SKIPPED together, ignoring open work', () => {
      const tasks = [
        taskWithStatus('COMPLETED'),
        taskWithStatus('PROMOTED'),
        taskWithStatus('SKIPPED'),
        taskWithStatus('PENDING'),
        taskWithStatus('IN_PROGRESS'),
        taskWithStatus('BLOCKED'),
        taskWithStatus('CANCELED'),
      ];

      // 7 tasks, 3 resolved (1 completed + 1 promoted + 1 skipped) -> the Tasks
      // tab reads 3/7.
      expect(getResolvedTaskCount(tasks)).toBe(3);
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
      ['PROMOTED', false],
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
        'PROMOTED',
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

  describe('getPlanIsTerminal', () => {
    test.each([
      ['COMPLETED', true],
      ['CANCELED', true],
      ['PROMOTED', true],
      ['SKIPPED', true],
      ['PENDING', false],
      ['QUEUED', false],
      ['IN_PROGRESS', false],
      ['BACKLOG', false],
      ['BLOCKED', false],
      ['', false],
    ] as const)('status %s -> terminal: %s', (status, expected) => {
      expect(getPlanIsTerminal(status)).toBe(expected);
    });

    test('returns false when status is null or undefined', () => {
      expect(getPlanIsTerminal(null)).toBe(false);
      expect(getPlanIsTerminal(undefined)).toBe(false);
    });

    test('is mutually exclusive with getPlanIsRunning across every status', () => {
      for (const status of [
        'QUEUED',
        'IN_PROGRESS',
        'PENDING',
        'COMPLETED',
        'PROMOTED',
        'SKIPPED',
        'BLOCKED',
        'BACKLOG',
        'CANCELED',
        '',
        null,
        undefined,
      ] as const) {
        expect(getPlanIsTerminal(status) && getPlanIsRunning(status)).toBe(
          false,
        );
      }
    });
  });

  describe('getPlanStatusBadgeColor', () => {
    test('gives PROMOTED its own "moved on" color, distinct from SKIPPED and COMPLETED', () => {
      expect(getPlanStatusBadgeColor('PROMOTED')).toBe('blue');
      expect(getPlanStatusBadgeColor('PROMOTED')).not.toBe(
        getPlanStatusBadgeColor('SKIPPED'),
      );
      expect(getPlanStatusBadgeColor('PROMOTED')).not.toBe(
        getPlanStatusBadgeColor('COMPLETED'),
      );
    });

    test('keeps SKIPPED on slate', () => {
      expect(getPlanStatusBadgeColor('SKIPPED')).toBe('slate');
    });
  });
});
