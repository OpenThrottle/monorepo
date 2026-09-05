import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import type { EntityManager, Repository } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';
import { tasksFactory } from './tasks.factory';
import {
  TASK_SORT_ORDER_GAP,
  TasksService,
  type CreateTaskBatchItem,
} from './tasks.service';

describe('TasksService', () => {
  type GetRepository = ReturnType<TasksService['getRepository']>;

  const mockPlanRepo = {
    update: vi
      .fn()
      .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] }),
  };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(mockPlanRepo),
  });

  const mockQueryBuilder = {
    getRawOne: vi.fn(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  const mockTaskRepo = createMock<GetRepository>({
    count: vi.fn().mockResolvedValue(0),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    find: vi.fn(() => Promise.resolve(tasksFactory.buildList(2))),
  });

  let service: TasksService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        TasksService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
      ],
    }).compile();

    service = app.get<TasksService>(TasksService);
  });

  beforeEach(() => {
    vi.mocked(mockQueryBuilder.getRawOne).mockReset();
    vi.mocked(mockQueryBuilder.select).mockClear();
    vi.mocked(mockQueryBuilder.where).mockClear();
  });

  beforeEach(() => {
    vi.mocked(mockPlanRepo.update).mockReset().mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
    vi.mocked(mockTaskRepo.count).mockReset().mockResolvedValue(0);
  });

  describe('getRepository', () => {
    it('returns the task repository', () => {
      const repo = service.getRepository();
      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const tasks = await repo.find();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({
        planId: expect.any(String),
        status: expect.any(String),
        title: expect.any(String),
      });
    });
  });

  describe('resolveNextSortOrder', () => {
    const planId = '44444444-4444-4444-4444-444444444444';

    it('returns 1000 when plan has no tasks', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ max: null });

      const next = await service.resolveNextSortOrder(planId);

      expect(next).toBe(TASK_SORT_ORDER_GAP);
    });

    it('returns MAX(sort_order) + gap when plan has tasks', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ max: '5000' });

      const next = await service.resolveNextSortOrder(planId);

      expect(next).toBe(5000 + TASK_SORT_ORDER_GAP);
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
    };

    const txQueryBuilder = {
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
        ) =>
          typeof isolationOrRun === 'function'
            ? isolationOrRun(txManager)
            : Promise.resolve(undefined),
      );
    });

    it('returns empty without a transaction when no items are given', async () => {
      const result = await service.createTasksBatch(planId, []);

      expect(result).toEqual([]);
      expect(mockTaskRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('appends MAX+gap stepping in array order when sortOrder is omitted', async () => {
      vi.mocked(txQueryBuilder.getRawOne).mockResolvedValue({ max: '2000' });

      const created = await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: null, title: 'a' },
        { ...baseItem, sortOrder: null, title: 'b' },
      ]);

      expect(created.map((task) => task.sortOrder)).toEqual([
        2000 + TASK_SORT_ORDER_GAP,
        2000 + 2 * TASK_SORT_ORDER_GAP,
      ]);
    });

    it('respects explicit per-item sortOrder and only steps auto items', async () => {
      vi.mocked(txQueryBuilder.getRawOne).mockResolvedValue({ max: null });

      const created = await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: 500, title: 'explicit' },
        { ...baseItem, sortOrder: null, title: 'auto' },
      ]);

      expect(created.map((task) => task.sortOrder)).toEqual([
        500,
        TASK_SORT_ORDER_GAP,
      ]);
    });

    // Guards the race-safety claim in the createTasksBatch JSDoc: the parent
    // plan must be row-locked with pessimistic_write before MAX(sort_order) is
    // read, so concurrent batch creates serialize instead of computing the same
    // existingMax and colliding on the (plan_id, sort_order) unique index.
    it('row-locks the parent plan with pessimistic_write before computing sort_order', async () => {
      vi.mocked(txQueryBuilder.getRawOne).mockResolvedValue({ max: '1000' });

      await service.createTasksBatch(planId, [
        { ...baseItem, sortOrder: null, title: 'a' },
      ]);

      expect(txQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(txQueryBuilder.where).toHaveBeenCalledWith('plan.id = :planId', {
        planId,
      });
    });
  });

  describe('syncParentPlanStatus', () => {
    it('returns true and runs atomic update when a non-IN_PROGRESS plan row is updated', async () => {
      const planId = '11111111-1111-1111-1111-111111111111';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(true);
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        { id: planId, status: Not('IN_PROGRESS') },
        { completedAt: null, status: 'IN_PROGRESS' },
      );
    });

    it('returns false when the plan is already IN_PROGRESS (no row matched)', async () => {
      const planId = '22222222-2222-2222-2222-222222222222';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(false);
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        { id: planId, status: Not('IN_PROGRESS') },
        { completedAt: null, status: 'IN_PROGRESS' },
      );
    });

    it('treats undefined affected as no update', async () => {
      const planId = '33333333-3333-3333-3333-333333333333';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: undefined,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(false);
    });
  });

  describe('completeParentPlanIfTasksDone', () => {
    const planId = '55555555-5555-5555-5555-555555555555';

    it('completes an IN_PROGRESS plan when no remaining tasks exist', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(0);
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const completed = await service.completeParentPlanIfTasksDone(planId);

      expect(completed).toBe(true);
      expect(mockTaskRepo.count).toHaveBeenCalledWith({
        where: {
          planId,
          status: In(['BLOCKED', 'IN_PROGRESS', 'PENDING', 'QUEUED']),
        },
      });
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        { id: planId, status: 'IN_PROGRESS' },
        { completedAt: expect.any(Date), status: 'COMPLETED' },
      );
    });

    it('does not complete the plan while tasks remain', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(2);

      const completed = await service.completeParentPlanIfTasksDone(planId);

      expect(completed).toBe(false);
      expect(mockPlanRepo.update).not.toHaveBeenCalled();
    });

    it('returns false when the plan is not IN_PROGRESS (no row matched)', async () => {
      vi.mocked(mockTaskRepo.count).mockResolvedValueOnce(0);
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      const completed = await service.completeParentPlanIfTasksDone(planId);

      expect(completed).toBe(false);
    });
  });

  describe('midpointBesideAnchor', () => {
    const planId = '77777777-7777-7777-7777-777777777777';

    // A repository whose neighbor lookup (createQueryBuilder→clone→…→getRawOne)
    // resolves to the given value ('4000', or null for "no neighbor").
    const repoWithNeighbor = (
      neighborValue: string | null,
    ): Repository<Task> => {
      const cloned = {
        andWhere: vi.fn().mockReturnThis(),
        getRawOne: vi
          .fn()
          .mockResolvedValue(
            neighborValue == null ? undefined : { value: neighborValue },
          ),
        orderBy: vi.fn().mockReturnThis(),
      };
      const builder = {
        clone: vi.fn().mockReturnValue(cloned),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };
      return createMock<Repository<Task>>({
        createQueryBuilder: vi.fn().mockReturnValue(builder),
      });
    };

    it('after: midpoint between anchor and its next neighbor', async () => {
      const slot = await service.midpointBesideAnchor(
        planId,
        2000,
        'after',
        repoWithNeighbor('4000'),
      );
      expect(slot).toBe(3000);
    });

    it('before: midpoint between anchor and its previous neighbor', async () => {
      const slot = await service.midpointBesideAnchor(
        planId,
        2000,
        'before',
        repoWithNeighbor('1000'),
      );
      expect(slot).toBe(1500);
    });

    it('steps out one gap when the anchor is the plan edge (no neighbor)', async () => {
      await expect(
        service.midpointBesideAnchor(
          planId,
          2000,
          'after',
          repoWithNeighbor(null),
        ),
      ).resolves.toBe(2000 + TASK_SORT_ORDER_GAP);
      await expect(
        service.midpointBesideAnchor(
          planId,
          2000,
          'before',
          repoWithNeighbor(null),
        ),
      ).resolves.toBe(2000 - TASK_SORT_ORDER_GAP);
    });

    it('returns null when the integer gap to the neighbor is exhausted', async () => {
      await expect(
        service.midpointBesideAnchor(
          planId,
          2000,
          'after',
          repoWithNeighbor('2001'),
        ),
      ).resolves.toBeNull();
      await expect(
        service.midpointBesideAnchor(
          planId,
          2000,
          'before',
          repoWithNeighbor('1999'),
        ),
      ).resolves.toBeNull();
    });
  });

  describe('allocateSortOrderBesideAnchor', () => {
    const planId = '88888888-8888-8888-8888-888888888888';
    const anchorId = '99999999-9999-9999-9999-999999999999';

    const txPlanBuilder = {
      getOne: vi.fn().mockResolvedValue(null),
      setLock: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const txFindOne = vi.fn();
    const txRepo = createMock<Repository<Task>>({
      createQueryBuilder: vi.fn().mockReturnValue(txPlanBuilder),
      findOne: txFindOne,
    });
    const txManager = createMock<EntityManager>({
      getRepository: () => txRepo,
    });

    beforeEach(() => {
      txFindOne.mockReset();
      vi.mocked(txPlanBuilder.setLock).mockClear();
      vi.mocked(mockTaskRepo.manager.transaction).mockImplementation(
        (
          isolationOrRun:
            IsolationLevel | ((manager: EntityManager) => Promise<unknown>),
        ) =>
          typeof isolationOrRun === 'function'
            ? isolationOrRun(txManager)
            : Promise.resolve(undefined),
      );
    });

    it('locks the plan and returns the midpoint slot on the happy path', async () => {
      txFindOne.mockResolvedValue(
        tasksFactory.build({ id: anchorId, sortOrder: 2000 }),
      );
      const midpoint = vi
        .spyOn(service, 'midpointBesideAnchor')
        .mockResolvedValue(2500);
      const rebalance = vi
        .spyOn(service, 'rebalancePlanSortOrders')
        .mockResolvedValue();

      const slot = await service.allocateSortOrderBesideAnchor(
        planId,
        anchorId,
        'after',
      );

      expect(slot).toBe(2500);
      expect(txPlanBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(rebalance).not.toHaveBeenCalled();
      midpoint.mockRestore();
      rebalance.mockRestore();
    });

    it('rebalances and retries once when the gap is exhausted', async () => {
      txFindOne.mockResolvedValue(
        tasksFactory.build({ id: anchorId, sortOrder: 2000 }),
      );
      const midpoint = vi
        .spyOn(service, 'midpointBesideAnchor')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(3000);
      const rebalance = vi
        .spyOn(service, 'rebalancePlanSortOrders')
        .mockResolvedValue();

      const slot = await service.allocateSortOrderBesideAnchor(
        planId,
        anchorId,
        'before',
      );

      expect(slot).toBe(3000);
      expect(rebalance).toHaveBeenCalledTimes(1);
      midpoint.mockRestore();
      rebalance.mockRestore();
    });

    it('throws when the anchor is not in the plan', async () => {
      txFindOne.mockResolvedValue(null);

      await expect(
        service.allocateSortOrderBesideAnchor(planId, anchorId, 'after'),
      ).rejects.toThrow(/anchor task/);
    });
  });

  describe('hook CRUD', () => {
    const planId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    beforeEach(() => {
      vi.mocked(mockTaskRepo.create).mockReturnValue(tasksFactory.build());
      vi.mocked(mockTaskRepo.save).mockResolvedValue(tasksFactory.build());
      vi.mocked(mockTaskRepo.findOne).mockReset();
      vi.mocked(mockTaskRepo.delete).mockReset();
    });

    it('addAfterHook plan-level lands at the tail band with scope=once (template)', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({
        value: '3000',
      });

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
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({
        value: '1000',
      });

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

    it('detachHook deletes only rows that are hooks', async () => {
      vi.mocked(mockTaskRepo.delete).mockResolvedValue({
        affected: 1,
        raw: [],
      });

      const removed = await service.detachHook('hook-1');

      expect(removed).toBe(true);
      expect(mockTaskRepo.delete).toHaveBeenCalledWith({
        hookRole: Not(IsNull()),
        id: 'hook-1',
      });
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
});
