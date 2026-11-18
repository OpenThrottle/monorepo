import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Task } from './task.entity.ts';
import { TASK_SORT_ORDER_GAP } from './tasks.constants.ts';
import type { TaskCreateInput, TasksRepositoryMock } from './tasks.types.ts';

/**
 * @description Builds a {@link TasksRepositoryMock} that starts as an empty `tasks` table (see
 * `createBaseRepositoryMock`): no hooks, no counts, no matching or neighbouring tasks, no remaining tasks, the first sort order
 * of an empty plan. The write methods that would have to invent a row (`addAfterHook`,
 * `addBeforeHook`) reject until a test stubs them. Provide it in place of `TasksRepository`
 * and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createTasksRepositoryMock(): TasksRepositoryMock {
  const notStubbed = (method: string): Promise<never> => {
    return Promise.reject(
      new Error(`tasks.${method} is not stubbed in this test`),
    );
  };

  return {
    ...createBaseRepositoryMock<Task, TaskCreateInput>('tasks'),
    addAfterHook: vi.fn(() => {
      return notStubbed('addAfterHook');
    }),
    addBeforeHook: vi.fn(() => {
      return notStubbed('addBeforeHook');
    }),
    allocateSortOrderBesideAnchor: vi.fn(async () => {
      return TASK_SORT_ORDER_GAP;
    }),
    countByDateRange: vi.fn(async () => {
      return 0;
    }),
    countByPlanIds: vi.fn(async () => {
      return new Map();
    }),
    countByProjectId: vi.fn(async () => {
      return 0;
    }),
    createTasksBatch: vi.fn(async () => {
      return [];
    }),
    detachHook: vi.fn(async () => {
      return false;
    }),
    findByIdPrefix: vi.fn(async () => {
      return [];
    }),
    findFirstByTitleContaining: vi.fn(async () => {
      return null;
    }),
    findFirstMentioning: vi.fn(async () => {
      return null;
    }),
    getNeighborSortOrder: vi.fn(async () => {
      return null;
    }),
    getPlanHooks: vi.fn(async () => {
      return { after: [], before: [] };
    }),
    getPlanHooksForPlans: vi.fn(async () => {
      return new Map();
    }),
    getSortOrderExtent: vi.fn(async () => {
      return null;
    }),
    getTaskHooks: vi.fn(async () => {
      return { after: [], before: [] };
    }),
    hasRemainingTasks: vi.fn(async () => {
      return false;
    }),
    midpointBesideAnchor: vi.fn(async () => {
      return TASK_SORT_ORDER_GAP;
    }),
    rebalancePlanSortOrders: vi.fn(async () => {
      return undefined;
    }),
    resolveNextSortOrder: vi.fn(async () => {
      return TASK_SORT_ORDER_GAP;
    }),
  };
}
