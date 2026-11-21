import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  appendSortOrder,
  edgeSortOrder,
  insertBeside,
  rebalanceScope,
  reorderInScope,
  SORT_ORDER_GAP,
} from '@openthrottle/nestjs-postgres';
import type { EntityManager, Repository } from 'typeorm';
import { And, In, IsNull, LessThan, MoreThanOrEqual, Not } from 'typeorm';
import type { IsolationLevel } from 'typeorm/driver/types/IsolationLevel.js';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { REMAINING_TASK_STATUSES } from '../../plan-task-status/plan-task-status.constants.ts';
import { Task } from './task.entity.ts';
import { TASKS_SORT_ORDER_SCOPE } from './tasks.constants.ts';
import { tasksFactory } from './tasks.factory.ts';
import { TasksRepository } from './tasks.repository.ts';
import type { CreateTaskBatchItem } from './tasks.types.ts';

vi.mock('@openthrottle/nestjs-postgres', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    appendSortOrder: vi.fn(),
    edgeSortOrder: vi.fn(),
    insertBeside: vi.fn(),
    rebalanceScope: vi.fn(),
    reorderInScope: vi.fn(),
  };
});

describe('TasksRepository', () => {
  const mockQueryBuilder = {
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
    getOne: vi.fn(),
    getRawMany: vi.fn(),
    getRawOne: vi.fn(),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  const mockTaskRepo = createMock<Repository<Task>>({
    count: vi.fn().mockResolvedValue(0),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    find: vi.fn(() => Promise.resolve(tasksFactory.buildList(2))),
    target: Task,
  });

  let service: TasksRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TasksRepository,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
      ],
    }).compile();

    service = app.get<TasksRepository>(TasksRepository);
  });

  beforeEach(() => {
    vi.mocked(mockQueryBuilder.getRawOne).mockReset();
    vi.mocked(mockQueryBuilder.getRawMany).mockReset();
    vi.mocked(mockQueryBuilder.select).mockClear();
    vi.mocked(mockQueryBuilder.where).mockClear();
    vi.mocked(mockQueryBuilder.andWhere).mockClear();
  });

  beforeEach(() => {
    vi.mocked(mockTaskRepo.count).mockReset().mockResolvedValue(0);
  });

  describe('resolveNextSortOrder', () => {
    it('appends past the last live task of the plan through the shared helper', async () => {
      vi.mocked(appendSortOrder).mockResolvedValue(6000);

      await expect(service.resolveNextSortOrder('plan-1')).resolves.toBe(6000);
      expect(appendSortOrder).toHaveBeenCalledWith(
        mockTaskRepo.manager,
        TASKS_SORT_ORDER_SCOPE,
        'plan-1',
      );
    });
  });

  describe('createTasksBatch', () => {
    const planId = '66666666-6666-6666-6666-666666666666';

    const baseItem: Omit<CreateTaskBatchItem, 'sortOrder' | 'title'> = {
      assignee: null,
      category: null,
      description: null,
      project: null,
      projectId: null,
      requirements: [],
      status: 'PENDING',
      summary: null,
      wave: null,
    };

    const txQueryBuilder = {
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(null),
      getRawOne: vi.fn(),
      select: vi.fn().mockReturnThis(),
      setLock: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const txRepo = createMock<Repository<Task>>({
      create: vi.fn((entity) => entity),
      createQueryBuilder: vi.fn().mockReturnValue(txQueryBuilder),
      save: vi.fn((entities) => Promise.resolve(entities)),
    });
    const txManager = createMock<EntityManager>({
      getRepository: () => txRepo,
    });

    beforeEach(() => {
      vi.mocked(txQueryBuilder.getRawOne).mockReset();
      vi.mocked(txQueryBuilder.setLock).mockClear();
      vi.mocked(txQueryBuilder.where).mockClear();
      vi.mocked(txRepo.create).mockClear();
      vi.mocked(txRepo.save).mockClear();
      vi.mocked(mockTaskRepo.manager.transaction).mockImplementation(
        (
          isolationOrRun:
            IsolationLevel | ((manager: EntityManager) => Promise<unknown>),
        ) => {
          if (typeof isolationOrRun === 'function') {
            return isolationOrRun(txManager);
          }
          return Promise.resolve(undefined);
        },
      );
    });

    it('returns empty without a transaction when no items are given', async () => {
      const result = await service.createTasksBatch(planId, []);

      expect(result).toEqual([]);
      expect(mockTaskRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('appends past the last task, stepping in array order when sortOrder is omitted', async () => {
      vi.mocked(appendSortOrder).mockResolvedValue(2000 + SORT_ORDER_GAP);

      const created = await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: null, title: 'a' },
        { ...baseItem, sortOrder: null, title: 'b' },
      ]);

      expect(created.map((task) => task.sortOrder)).toEqual([
        2000 + SORT_ORDER_GAP,
        2000 + 2 * SORT_ORDER_GAP,
      ]);
    });

    it('respects explicit per-item sortOrder and only steps auto items', async () => {
      vi.mocked(appendSortOrder).mockResolvedValue(SORT_ORDER_GAP);

      const created = await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: 500, title: 'explicit' },
        { ...baseItem, sortOrder: null, title: 'auto' },
      ]);

      expect(created.map((task) => task.sortOrder)).toEqual([
        500,
        SORT_ORDER_GAP,
      ]);
    });

    // Guards the race-safety claim in the createTasksBatch JSDoc: the append read runs on
    // the batch's own transaction manager, so the plan's sort-order lock it takes covers the
    // inserts and concurrent batch creates serialize.
    it('reads the next sort order inside the batch transaction', async () => {
      vi.mocked(appendSortOrder).mockResolvedValue(SORT_ORDER_GAP);

      await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: null, title: 'a' },
      ]);

      expect(appendSortOrder).toHaveBeenCalledWith(
        txManager,
        TASKS_SORT_ORDER_SCOPE,
        planId,
      );
    });
  });

  describe('hasRemainingTasks', () => {
    const planId = '55555555-5555-5555-5555-555555555555';

    it('returns true when a non-terminal task remains', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(2);

      const remaining = await service.hasRemainingTasks(planId);

      expect(remaining).toBe(true);
      expect(mockTaskRepo.count).toHaveBeenCalledWith({
        where: {
          planId,
          status: In([...REMAINING_TASK_STATUSES]),
        },
      });
    });

    it('does not count PROMOTED (or other resolved) tasks as remaining', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(0);

      await service.hasRemainingTasks(planId);

      const call = vi.mocked(mockTaskRepo.count).mock.lastCall;
      expect(JSON.stringify(call?.[0])).not.toContain('PROMOTED');
    });

    it('returns false when no non-terminal task remains', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(0);

      const remaining = await service.hasRemainingTasks(planId);

      expect(remaining).toBe(false);
    });
  });

  describe('allocateSortOrderBesideAnchor', () => {
    const planId = '88888888-8888-8888-8888-888888888888';
    const anchorId = '99999999-9999-9999-9999-999999999999';

    it('returns the slot the shared helper finds beside the anchor', async () => {
      vi.mocked(insertBeside).mockResolvedValue({
        kind: 'slot',
        sortOrder: 2500,
      });

      await expect(
        service.allocateSortOrderBesideAnchor(planId, anchorId, 'after'),
      ).resolves.toBe(2500);
      expect(insertBeside).toHaveBeenCalledWith(
        mockTaskRepo.manager,
        TASKS_SORT_ORDER_SCOPE,
        planId,
        anchorId,
        'after',
      );
    });

    it('throws when the anchor is not in the plan', async () => {
      vi.mocked(insertBeside).mockResolvedValue({ kind: 'anchor-not-found' });

      await expect(
        service.allocateSortOrderBesideAnchor(planId, anchorId, 'after'),
      ).rejects.toThrow(/anchor task/);
    });

    it('throws when no slot exists even after a rebalance', async () => {
      vi.mocked(insertBeside).mockResolvedValue({ kind: 'no-room' });

      await expect(
        service.allocateSortOrderBesideAnchor(planId, anchorId, 'before'),
      ).rejects.toThrow(/no sort_order slot/);
    });
  });

  describe('reorderInPlan', () => {
    it('reorders through the shared helper and passes its result back', async () => {
      vi.mocked(reorderInScope).mockResolvedValue({
        assignments: [],
        kind: 'reordered',
      });

      await expect(service.reorderInPlan('plan-1', ['a'])).resolves.toEqual({
        assignments: [],
        kind: 'reordered',
      });
      expect(reorderInScope).toHaveBeenCalledWith(
        mockTaskRepo.manager,
        TASKS_SORT_ORDER_SCOPE,
        'plan-1',
        ['a'],
      );
    });
  });

  describe('hook CRUD', () => {
    const planId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    beforeEach(() => {
      vi.mocked(mockTaskRepo.create).mockReturnValue(tasksFactory.build());
      vi.mocked(mockTaskRepo.save).mockResolvedValue(tasksFactory.build());
      vi.mocked(mockTaskRepo.findOne).mockReset();
      vi.mocked(mockTaskRepo.softDelete).mockReset();
    });

    it('addAfterHook plan-level lands at the tail band with scope=once (template)', async () => {
      vi.mocked(edgeSortOrder).mockResolvedValue(4000);

      await service.addAfterHook(planId, null, { source: 'template' });

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hookRole: 'after',
          hookScope: 'once',
          hookSource: 'template',
          parentTaskId: null,
          planId,
          skillSlug: null,
          sortOrder: 4000,
          status: 'PENDING',
        }),
      );
    });

    it('addBeforeHook plan-level supports scope=each and a skill source', async () => {
      vi.mocked(edgeSortOrder).mockResolvedValue(0);

      await service.addBeforeHook(planId, null, {
        scope: 'each',
        skillSlug: 'validate',
        source: 'skill',
      });

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hookRole: 'before',
          hookScope: 'each',
          hookSource: 'skill',
          parentTaskId: null,
          skillSlug: 'validate',
          sortOrder: 0,
        }),
      );
    });

    it('addAfterHook task-level delegates to the anchor allocator with null scope', async () => {
      vi.mocked(mockTaskRepo.findOne).mockResolvedValue(
        tasksFactory.build({ hookRole: null, id: 'anchor' }),
      );
      const alloc = vi
        .spyOn(service, 'allocateSortOrderBesideAnchor')
        .mockResolvedValue(2500);

      await service.addAfterHook(planId, 'anchor', { source: 'template' });

      expect(alloc).toHaveBeenCalledWith(planId, 'anchor', 'after');
      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hookRole: 'after',
          hookScope: null,
          parentTaskId: 'anchor',
          sortOrder: 2500,
        }),
      );
      alloc.mockRestore();
    });

    it('rejects a skill hook without a skillSlug', async () => {
      await expect(
        service.addBeforeHook(planId, null, { source: 'skill' }),
      ).rejects.toThrow(/requires a skillSlug/);
    });

    it('rejects a scope on a task-level hook', async () => {
      await expect(
        service.addAfterHook(planId, 'anchor', {
          scope: 'once',
          source: 'template',
        }),
      ).rejects.toThrow(/plan-level/);
    });

    it('enforces one-level nesting: the anchor must be a regular task', async () => {
      vi.mocked(mockTaskRepo.findOne).mockResolvedValue(
        tasksFactory.build({ hookRole: 'before', id: 'anchor' }),
      );

      await expect(
        service.addAfterHook(planId, 'anchor', { source: 'template' }),
      ).rejects.toThrow(/one level deep/);
    });

    it('detachHook soft deletes only live rows that are hooks', async () => {
      vi.mocked(mockTaskRepo.softDelete).mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const removed = await service.detachHook('hook-1');

      expect(removed).toBe(true);
      expect(mockTaskRepo.softDelete).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        hookRole: Not(IsNull()),
        id: 'hook-1',
      });
    });

    it('detachHook reports false when no live hook matched', async () => {
      vi.mocked(mockTaskRepo.softDelete).mockResolvedValue({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      await expect(service.detachHook('regular-task')).resolves.toBe(false);
    });

    it('getPlanHooks groups plan-level hooks into before/after', async () => {
      const before = tasksFactory.build({
        hookRole: 'before',
        parentTaskId: null,
      });
      const after = tasksFactory.build({
        hookRole: 'after',
        parentTaskId: null,
      });
      vi.mocked(mockTaskRepo.find).mockResolvedValueOnce([before, after]);

      const grouped = await service.getPlanHooks(planId);

      expect(grouped.before).toEqual([before]);
      expect(grouped.after).toEqual([after]);
      expect(mockTaskRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hookRole: Not(IsNull()), parentTaskId: IsNull(), planId },
        }),
      );
    });

    it('getPlanHooksForPlans fetches many plans in one query, keyed by planId', async () => {
      const beforeA = tasksFactory.build({
        hookRole: 'before',
        parentTaskId: null,
        planId: 'plan-a',
      });
      const afterC = tasksFactory.build({
        hookRole: 'after',
        parentTaskId: null,
        planId: 'plan-c',
      });
      vi.mocked(mockTaskRepo.find).mockClear();
      vi.mocked(mockTaskRepo.find).mockResolvedValueOnce([beforeA, afterC]);

      const byPlanId = await service.getPlanHooksForPlans([
        'plan-a',
        'plan-b',
        'plan-c',
        'plan-a',
      ]);

      // One query for the whole batch, with duplicate ids collapsed.
      expect(mockTaskRepo.find).toHaveBeenCalledTimes(1);
      expect(mockTaskRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            hookRole: Not(IsNull()),
            parentTaskId: IsNull(),
            planId: In(['plan-a', 'plan-b', 'plan-c']),
          },
        }),
      );
      expect(byPlanId.get('plan-a')).toEqual({ after: [], before: [beforeA] });
      expect(byPlanId.get('plan-c')).toEqual({ after: [afterC], before: [] });
      // A plan with no hook rows is simply absent.
      expect(byPlanId.has('plan-b')).toBe(false);
    });

    it('getPlanHooksForPlans short-circuits on an empty id list', async () => {
      vi.mocked(mockTaskRepo.find).mockClear();

      const byPlanId = await service.getPlanHooksForPlans([]);

      expect(byPlanId.size).toBe(0);
      expect(mockTaskRepo.find).not.toHaveBeenCalled();
    });

    it('getTaskHooks groups a task’s before/after hooks', async () => {
      const before = tasksFactory.build({
        hookRole: 'before',
        parentTaskId: 'anchor',
      });
      vi.mocked(mockTaskRepo.find).mockResolvedValueOnce([before]);

      const grouped = await service.getTaskHooks('anchor');

      expect(grouped.before).toEqual([before]);
      expect(grouped.after).toEqual([]);
    });
  });

  describe('countByPlanIds', () => {
    it('counts live tasks per plan in one grouped query', async () => {
      vi.mocked(mockQueryBuilder.getRawMany).mockResolvedValue([
        { count: '3', planId: 'plan-a' },
        { count: '1', planId: 'plan-c' },
      ]);

      const counts = await service.countByPlanIds([
        'plan-a',
        'plan-b',
        'plan-c',
        'plan-a',
      ]);

      expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.planId IN (:...planIds)',
        { planIds: ['plan-a', 'plan-b', 'plan-c'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('task.planId');
      expect(counts.get('plan-a')).toBe(3);
      expect(counts.get('plan-c')).toBe(1);
      expect(counts.has('plan-b')).toBe(false);
    });

    it('narrows the count to the given statuses', async () => {
      vi.mocked(mockQueryBuilder.getRawMany).mockResolvedValue([]);

      await service.countByPlanIds(['plan-a'], ['COMPLETED', 'SKIPPED']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status IN (:...statuses)',
        { statuses: ['COMPLETED', 'SKIPPED'] },
      );
    });

    it('applies no status clause for an omitted or empty status list', async () => {
      vi.mocked(mockQueryBuilder.getRawMany).mockResolvedValue([]);

      await service.countByPlanIds(['plan-a']);
      await service.countByPlanIds(['plan-a'], []);

      const clauses = vi
        .mocked(mockQueryBuilder.andWhere)
        .mock.calls.map(([clause]) => clause);
      expect(clauses).not.toContain('task.status IN (:...statuses)');
    });

    it('short-circuits on an empty id list', async () => {
      const counts = await service.countByPlanIds([]);

      expect(counts.size).toBe(0);
      expect(mockQueryBuilder.getRawMany).not.toHaveBeenCalled();
    });
  });

  describe('findByIdPrefix', () => {
    it('matches live tasks by hyphen-stripped id, joins the live plan and limits', async () => {
      const tasks = tasksFactory.buildList(2);
      vi.mocked(mockQueryBuilder.getMany).mockResolvedValue(tasks);

      const result = await service.findByIdPrefix('f5e40886', 4);

      expect(result).toBe(tasks);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'task.plan',
        'plan',
        'plan.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        `REPLACE(task.id::text, '-', '') ILIKE :pattern`,
        { pattern: 'f5e40886%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'task.updatedAt',
        'DESC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(4);
    });
  });

  describe('countByProjectId', () => {
    it('counts the live tasks of the project', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValue(7);

      await expect(service.countByProjectId('project-1')).resolves.toBe(7);
      expect(mockTaskRepo.count).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });
  });

  describe('rebalancePlanSortOrders', () => {
    it('rebalances the plan through the shared helper', async () => {
      vi.mocked(rebalanceScope).mockResolvedValue({
        kind: 'rebalanced',
        rowCount: 3,
      });

      await service.rebalancePlanSortOrders('plan-1');

      expect(rebalanceScope).toHaveBeenCalledWith(
        mockTaskRepo.manager,
        TASKS_SORT_ORDER_SCOPE,
        'plan-1',
      );
    });

    it('joins the caller transaction when handed a manager', async () => {
      const callerManager = createMock<EntityManager>();

      await service.rebalancePlanSortOrders('plan-1', callerManager);

      expect(rebalanceScope).toHaveBeenCalledWith(
        callerManager,
        TASKS_SORT_ORDER_SCOPE,
        'plan-1',
      );
    });
  });

  describe('remove', () => {
    const taskId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const softDelete = vi.fn();
    const findOneOrFail = vi.fn();

    beforeEach(() => {
      softDelete.mockReset();
      findOneOrFail.mockReset();
      const manager = createMock<EntityManager>({ findOneOrFail, softDelete });
      vi.mocked(mockTaskRepo.manager.transaction).mockImplementation(
        (
          isolationOrRun:
            IsolationLevel | ((manager: EntityManager) => Promise<unknown>),
        ) => {
          if (typeof isolationOrRun === 'function') {
            return isolationOrRun(manager);
          }
          return Promise.resolve(undefined);
        },
      );
    });

    it('soft deletes the task, then its live child tasks, in one transaction', async () => {
      const deleted = tasksFactory.build({
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
        id: taskId,
      });
      softDelete.mockResolvedValue({ affected: 1, raw: [] });
      findOneOrFail.mockResolvedValue(deleted);

      const result = await service.remove(taskId);

      expect(result).toBe(deleted);
      expect(mockTaskRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(softDelete.mock.calls).toEqual([
        [Task, { deletedAt: IsNull(), id: taskId }],
        [Task, { deletedAt: IsNull(), parentTaskId: taskId }],
      ]);
      expect(findOneOrFail).toHaveBeenCalledWith(Task, {
        where: { id: taskId },
        withDeleted: true,
      });
    });

    it('throws NotFoundException and leaves the children alone when no live task has the id', async () => {
      softDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove(taskId)).rejects.toThrow(NotFoundException);
      await expect(service.remove(taskId)).rejects.toThrow(
        `tasks record with ID "${taskId}" not found`,
      );
      expect(softDelete).toHaveBeenCalledTimes(2);
      expect(
        softDelete.mock.calls.every(([, criteria]) => 'id' in criteria),
      ).toBe(true);
    });
  });

  describe('countByDateRange', () => {
    it('counts live tasks whose column falls in [dayStart, dayEnd)', async () => {
      const dayStart = new Date('2026-01-01T00:00:00.000Z');
      const dayEnd = new Date('2026-01-02T00:00:00.000Z');
      vi.mocked(mockTaskRepo.count).mockResolvedValue(7);

      const count = await service.countByDateRange({
        column: 'completedAt',
        dayEnd,
        dayStart,
      });

      expect(count).toBe(7);
      expect(mockTaskRepo.count).toHaveBeenCalledWith({
        where: {
          completedAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
        },
      });
    });
  });

  describe('findFirstMentioning and findFirstByTitleContaining', () => {
    const planId = '55555555-5555-4555-8555-555555555555';

    it('matches the title or description of live tasks, lowest sort_order first', async () => {
      const task = tasksFactory.build();
      vi.mocked(mockQueryBuilder.getOne).mockResolvedValue(task);

      const found = await service.findFirstMentioning(planId, '/review');

      expect(found).toBe(task);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.title ILIKE :reference OR task.description ILIKE :reference)',
        { reference: '%/review%' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'task.sortOrder',
        'ASC',
      );
    });

    it('matches the title only, over live tasks', async () => {
      vi.mocked(mockQueryBuilder.getOne).mockResolvedValue(null);

      const found = await service.findFirstByTitleContaining(planId, 'docs');

      expect(found).toBeNull();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.title ILIKE :match',
        { match: '%docs%' },
      );
    });
  });

  describe('getSortOrderExtent', () => {
    const planId = '66666666-6666-4666-8666-666666666666';

    it('reads the extent over live tasks and parses the aggregate', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({
        value: '4000',
      });

      const extent = await service.getSortOrderExtent(planId, 'MAX');

      expect(extent).toBe(4000);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'MAX(task.sortOrder)',
        'value',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
    });

    it('leaves out the excluded tasks', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({
        value: '1000',
      });

      await service.getSortOrderExtent(planId, 'MIN', ['task-a', 'task-b']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.id NOT IN (:...excludeTaskIds)',
        { excludeTaskIds: ['task-a', 'task-b'] },
      );
    });

    it('returns null when no live task is left', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ value: null });

      expect(await service.getSortOrderExtent(planId, 'MIN')).toBeNull();
    });
  });

  describe('getNeighborSortOrder', () => {
    const base = {
      anchorSortOrder: 2000,
      excludeTaskId: 'task-a',
      planId: '77777777-7777-4777-8777-777777777777',
    };

    it('takes the smallest live sort_order above the anchor for after', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({
        value: '3000',
      });

      const neighbor = await service.getNeighborSortOrder({
        ...base,
        side: 'after',
      });

      expect(neighbor).toBe(3000);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'MIN(task.sortOrder)',
        'value',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deletedAt IS NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.sortOrder > :anchor',
        { anchor: 2000 },
      );
    });

    it('takes the largest live sort_order below the anchor for before', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ value: null });

      const neighbor = await service.getNeighborSortOrder({
        ...base,
        side: 'before',
      });

      expect(neighbor).toBeNull();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'MAX(task.sortOrder)',
        'value',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.sortOrder < :anchor',
        { anchor: 2000 },
      );
    });
  });
});
