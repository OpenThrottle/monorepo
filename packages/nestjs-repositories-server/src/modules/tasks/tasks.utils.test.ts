import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TASK_SORT_ORDER_GAP } from './tasks.constants.ts';
import { createTasksRepositoryMock } from './tasks.utils.ts';

describe('createTasksRepositoryMock', () => {
  it('starts as an empty tasks table', async () => {
    const repository = createTasksRepositoryMock();

    await expect(repository.countByPlanIds(['p'])).resolves.toEqual(new Map());
    await expect(repository.createTasksBatch('p', [])).resolves.toEqual([]);
    await expect(repository.detachHook('h')).resolves.toBe(false);
    await expect(repository.getPlanHooks('p')).resolves.toEqual({
      after: [],
      before: [],
    });
    await expect(repository.getPlanHooksForPlans(['p'])).resolves.toEqual(
      new Map(),
    );
    await expect(repository.getTaskHooks('t')).resolves.toEqual({
      after: [],
      before: [],
    });
    await expect(repository.hasRemainingTasks('p')).resolves.toBe(false);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('allocates the first sort order of an empty plan', async () => {
    const repository = createTasksRepositoryMock();

    await expect(repository.resolveNextSortOrder('p')).resolves.toBe(
      TASK_SORT_ORDER_GAP,
    );
    await expect(
      repository.allocateSortOrderBesideAnchor('p', 'a', 'after'),
    ).resolves.toBe(TASK_SORT_ORDER_GAP);
    await expect(
      repository.midpointBesideAnchor('p', 2000, 'after'),
    ).resolves.toBe(TASK_SORT_ORDER_GAP);
    await expect(
      repository.rebalancePlanSortOrders('p'),
    ).resolves.toBeUndefined();
  });

  it('rejects an unstubbed hook rather than inventing a row', async () => {
    const repository = createTasksRepositoryMock();

    await expect(
      repository.addAfterHook('p', null, { source: 'template' }),
    ).rejects.toThrow('tasks.addAfterHook is not stubbed');
    await expect(
      repository.addBeforeHook('p', null, { source: 'template' }),
    ).rejects.toThrow('tasks.addBeforeHook is not stubbed');
  });

  it('names the tasks table in inherited not-found errors', async () => {
    const repository = createTasksRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'tasks record with ID "a" not found',
    );
  });
});
