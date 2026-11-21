import { createMock } from '@golevelup/ts-vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Plan, Task } from '@openthrottle/nestjs-repositories-server';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  PLAN_TASK_LIST_ORDER,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createTasksRepositoryMock,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { isRecord } from '@openthrottle/nodejs-utils';
import { DataSource, QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import { PlanRulesEvaluationService } from '../../queues/plan-rules/evaluation/evaluation.service.ts';
import { TaggingEnqueueService } from '../../queues/tagging/enqueue/enqueue.service.ts';
import { TaskPromotionEnqueueService } from '../../queues/task-promotion/enqueue/enqueue.service.ts';
import { PlanTaskOrderService } from '../../services/plan-task-order/plan-task-order.service.ts';
import { PlanStatusService } from '../plans/plan-status/plan-status.service.ts';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import { TasksLoaders } from './loaders/loaders.service.ts';
import { TasksResolver } from './tasks.resolver.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

const mockPlanTaskOrderService = createMock<PlanTaskOrderService>();

describe('TasksResolver', () => {
  let resolver: TasksResolver;

  const transactionTaskRepo = {
    update: vi.fn().mockResolvedValue(undefined),
  };

  const repo = {
    count: vi.fn(),
    create: vi.fn((data: Record<string, unknown>) => ({
      ...data,
      id: typeof data.id === 'string' ? data.id : 'generated-task-id',
    })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    manager: {
      transaction: vi.fn(
        async (
          work: (manager: {
            getRepository: () => typeof transactionTaskRepo;
            save: (entity: Task) => Promise<Task>;
          }) => unknown,
        ) =>
          work({
            getRepository: () => transactionTaskRepo,
            // Delegate to repo.save so existing `expect(repo.save)` assertions still hold.
            save: (entity: Task) => repo.save(entity),
          }),
      ),
    },
    save: vi.fn((entity: Task) => Promise.resolve(entity)),
  };

  // `repo` stands in for the TypeORM-style persistence the repository wraps (and the transaction
  // manager's repository). The repository mock below delegates its reads, create, count and delete
  // to it, so every stub and assertion on `repo` still describes what reaches the database.
  const mockTasksRepository = createTasksRepositoryMock();
  mockTasksRepository.createTasksBatch.mockResolvedValue([]);
  mockTasksRepository.resolveNextSortOrder.mockResolvedValue(1000);
  mockTasksRepository.findOne.mockImplementation(async (options) => {
    return repo.findOne(options);
  });
  mockTasksRepository.findBy.mockImplementation(async (options) => {
    return repo.find(options);
  });
  mockTasksRepository.create.mockImplementation(async (input) => {
    return repo.save(tasksFactory.build(repo.create({ ...input })));
  });
  mockTasksRepository.countByProjectId.mockImplementation(async (projectId) => {
    return repo.count({ where: { projectId } });
  });
  mockTasksRepository.remove.mockImplementation(async (id) => {
    const result = await repo.delete({ id });

    if (!result.affected) {
      throw new NotFoundException();
    }

    return repo.findOne({ where: { id } });
  });
  const mockDataSource = asMock<DataSource>({
    transaction: repo.manager.transaction,
  });

  const mockPlanStatusService = createMock<PlanStatusService>({
    completeParentPlanIfTasksDone: vi.fn().mockResolvedValue(false),
    promoteParentPlanToInProgress: vi.fn().mockResolvedValue(false),
  });

  const mockNotificationsService = createMock<NotificationsService>({
    emitPlanStatusChanged: vi.fn(),
    emitPlanUpdated: vi.fn(),
  });

  const mockTaskPromotionEnqueueService =
    createMock<TaskPromotionEnqueueService>({
      enqueuePromotion: vi.fn(),
    });

  const mockLoaders = createMock<TasksLoaders>({
    planLoader: { load: vi.fn() },
    projectLoader: { load: vi.fn() },
  });

  const mockTask: Task = {
    assignee: null,
    category: 'testing',
    completedAt: null,
    createdAt: new Date('2026-02-01T21:33:51.891Z'),
    deletedAt: null,
    description: 'Create TaskData type if needed',
    hookChildren: [],
    hookRole: null,
    hookScope: null,
    hookSource: null,
    id: 'b366d480-6a4f-498b-8755-23ade25d2b24',
    parentTask: null,
    parentTaskId: null,
    plan: createMock<Plan>({
      assignee: null,
      author: 'Plan author',
      category: 'Plan category',
      createdAt: new Date('2026-02-01T21:33:51.891Z'),
      description: 'Plan description',
      id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      planEmbeddings: [],
      planOutputChunks: [],
      project: null,
      projectId: null,
      projectRelation: null,
      status: 'pending',
      summary: null,
      tasks: [],
      title: 'Plan title',
      updatedAt: new Date('2026-02-01T21:33:51.891Z'),
    }),
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    project: null,
    projectId: null,
    projectRelation: null,
    requirements: [],
    skillSlug: null,
    sortOrder: 1000,
    status: 'pending',
    summary: null,
    taskEmbeddings: [],
    title: 'Add graphql/tasks/',
    updatedAt: new Date('2026-02-01T21:33:51.891Z'),
    wave: null,
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TasksResolver,
        {
          provide: PlanRulesEvaluationService,
          useValue: createMock<PlanRulesEvaluationService>(),
        },
        {
          provide: TaggingEnqueueService,
          useValue: createMock<TaggingEnqueueService>(),
        },
        {
          provide: TaskPromotionEnqueueService,
          useValue: mockTaskPromotionEnqueueService,
        },
        { provide: TasksLoaders, useValue: mockLoaders },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        { provide: PlanStatusService, useValue: mockPlanStatusService },
        { provide: PlanTaskOrderService, useValue: mockPlanTaskOrderService },
        { provide: TasksRepository, useValue: mockTasksRepository },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: WorkLedgerCaptureService,
          useValue: createMock<WorkLedgerCaptureService>(),
        },
      ],
    }).compile();

    resolver = app.get<TasksResolver>(TasksResolver);
  });

  beforeEach(() => {
    vi.mocked(mockPlanStatusService.promoteParentPlanToInProgress).mockReset();
    vi.mocked(
      mockPlanStatusService.promoteParentPlanToInProgress,
    ).mockResolvedValue(false);
    vi.mocked(mockPlanStatusService.completeParentPlanIfTasksDone).mockReset();
    vi.mocked(
      mockPlanStatusService.completeParentPlanIfTasksDone,
    ).mockResolvedValue(false);
    vi.mocked(mockTasksRepository.resolveNextSortOrder).mockReset();
    vi.mocked(mockTasksRepository.resolveNextSortOrder).mockResolvedValue(1000);
    vi.mocked(mockNotificationsService.emitPlanStatusChanged).mockClear();
    vi.mocked(mockNotificationsService.emitPlanUpdated).mockClear();
    vi.mocked(repo.create).mockClear();
    vi.mocked(repo.save).mockClear();
    vi.mocked(repo.findOne).mockClear();
    vi.mocked(repo.find).mockClear();
    vi.mocked(transactionTaskRepo.update).mockClear();
    vi.mocked(repo.manager.transaction).mockClear();
    vi.mocked(mockTaskPromotionEnqueueService.enqueuePromotion).mockReset();
  });

  describe('promoteTaskToPlan', () => {
    test('maps a successful enqueue to success + jobId', async () => {
      vi.mocked(
        mockTaskPromotionEnqueueService.enqueuePromotion,
      ).mockResolvedValue({ jobId: 'promote:task-1' });

      const result = await resolver.promoteTaskToPlan(
        { idempotencyKey: null, taskId: 'task-1' },
        'user-1',
        'user',
      );

      expect(
        mockTaskPromotionEnqueueService.enqueuePromotion,
      ).toHaveBeenCalledWith({
        actorServiceAccountId: null,
        actorUserId: 'user-1',
        idempotencyKey: null,
        taskId: 'task-1',
      });
      expect(result).toEqual({
        error: null,
        jobId: 'promote:task-1',
        success: true,
      });
    });

    test('attributes a service-account principal via actorServiceAccountId', async () => {
      vi.mocked(
        mockTaskPromotionEnqueueService.enqueuePromotion,
      ).mockResolvedValue({ jobId: 'promote:task-2' });

      await resolver.promoteTaskToPlan(
        { idempotencyKey: null, taskId: 'task-2' },
        'svc-1',
        'service_account',
      );

      expect(
        mockTaskPromotionEnqueueService.enqueuePromotion,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          actorServiceAccountId: 'svc-1',
          actorUserId: null,
          taskId: 'task-2',
        }),
      );
    });

    test('maps a validation error to success false + error', async () => {
      vi.mocked(
        mockTaskPromotionEnqueueService.enqueuePromotion,
      ).mockResolvedValue({
        error: 'Task has already been promoted to a plan.',
      });

      const result = await resolver.promoteTaskToPlan(
        { idempotencyKey: null, taskId: 'task-3' },
        'user-1',
        'user',
      );

      expect(result).toEqual({
        error: 'Task has already been promoted to a plan.',
        jobId: null,
        success: false,
      });
    });
  });

  describe('task', () => {
    test('returns TaskObject when task exists', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(mockTask);

      const result = await resolver.task(mockTask.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTask.id);
      expect(result?.planId).toBe(mockTask.planId);
      expect(result?.title).toBe(mockTask.title);
      expect(result?.description).toBe(mockTask.description);
      expect(result?.category).toBe(mockTask.category);
      expect(result?.status).toBe(mockTask.status);
      const requirements = isRecord(result) ? result.requirements : undefined;
      expect(JSON.stringify(requirements ?? [])).toBe('[]');
      expect(result?.createdAt).toEqual(mockTask.createdAt);
      expect(result?.updatedAt).toEqual(mockTask.updatedAt);
    });

    test('returns null when task does not exist', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const result = await resolver.task('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('tasks', () => {
    test('returns array of TaskObjects', async () => {
      vi.mocked(repo.find).mockResolvedValue([mockTask]);

      const result = await resolver.tasks();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockTask.id);
      expect(result[0]?.title).toBe(mockTask.title);
    });

    test('orders by planId then sortOrder then createdAt ascending', async () => {
      vi.mocked(repo.find).mockResolvedValue([mockTask]);

      await resolver.tasks();

      expect(repo.find).toHaveBeenCalledWith({
        order: { ...CROSS_PLAN_TASK_LIST_ORDER },
        take: 100,
      });
    });

    test('returns empty array when no tasks', async () => {
      vi.mocked(repo.find).mockResolvedValue([]);

      const result = await resolver.tasks();

      expect(result).toEqual([]);
    });

    test('honors an explicit limit, clamped to the max', async () => {
      vi.mocked(repo.find).mockResolvedValue([]);

      await resolver.tasks(5);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );

      await resolver.tasks(10000);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });
  });

  describe('tasksByPlanId', () => {
    test('returns array of TaskObjects for plan', async () => {
      vi.mocked(repo.find).mockResolvedValue([mockTask]);

      const result = await resolver.tasksByPlanId({ planId: mockTask.planId });

      expect(result).toHaveLength(1);
      expect(result[0]?.planId).toBe(mockTask.planId);
    });

    test('orders by sortOrder then createdAt ascending', async () => {
      vi.mocked(repo.find).mockResolvedValue([mockTask]);

      await resolver.tasksByPlanId({ planId: mockTask.planId });

      expect(repo.find).toHaveBeenCalledWith({
        order: { ...PLAN_TASK_LIST_ORDER },
        where: { planId: mockTask.planId },
      });
    });
  });

  describe('remainingTasksByPlanId', () => {
    test('orders by sortOrder then createdAt ascending', async () => {
      vi.mocked(repo.find).mockResolvedValue([mockTask]);

      await resolver.remainingTasksByPlanId({ planId: mockTask.planId });

      expect(repo.find).toHaveBeenCalledWith({
        order: { ...PLAN_TASK_LIST_ORDER },
        where: {
          planId: mockTask.planId,
          status: expect.anything(),
        },
      });
    });
  });

  describe('tasksByProjectId', () => {
    const projectId = 'd232d811-6-4184a847c4f4';

    test('defaults to one page of 25 when limit/offset omitted', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-2' }];
      vi.mocked(repo.find).mockResolvedValue(tasks);
      vi.mocked(repo.count).mockResolvedValue(2);

      const result = await resolver.tasksByProjectId({
        limit: null,
        offset: null,
        projectId,
      });

      expect(result.items).toHaveLength(2);
      expect(result.tasks).toEqual(result.items);
      expect(result.totalCount).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(repo.find).toHaveBeenCalledWith({
        order: { ...CROSS_PLAN_TASK_LIST_ORDER },
        skip: 0,
        take: 25,
        where: { projectId },
      });
    });

    test('rejects a limit above 100 as BAD_USER_INPUT', async () => {
      await expect(
        resolver.tasksByProjectId({ limit: 101, offset: 0, projectId }),
      ).rejects.toThrow('limit must be between 1 and 100');
      expect(repo.find).not.toHaveBeenCalled();
    });

    test('returns paginated slice and totalCount when limit provided', async () => {
      const pageOfTasks = [mockTask];
      vi.mocked(repo.find).mockResolvedValue(pageOfTasks);
      vi.mocked(repo.count).mockResolvedValue(42);

      const result = await resolver.tasksByProjectId({
        limit: 20,
        offset: 0,
        projectId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.totalCount).toBe(42);
      expect(repo.find).toHaveBeenCalledWith({
        order: { ...CROSS_PLAN_TASK_LIST_ORDER },
        skip: 0,
        take: 20,
        where: { projectId },
      });
      expect(repo.count).toHaveBeenCalledWith({ where: { projectId } });
    });

    test('uses offset when provided with limit', async () => {
      vi.mocked(repo.find).mockResolvedValue([]);
      vi.mocked(repo.count).mockResolvedValue(10);

      await resolver.tasksByProjectId({
        limit: 10,
        offset: 20,
        projectId,
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('plan (ResolveField)', () => {
    test('returns null when parent has no planId', async () => {
      const parent = {
        assignee: null,
        category: mockTask.category,
        completedAt: null,
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        hookRole: null,
        hookScope: null,
        hookSource: null,
        id: mockTask.id,
        parentTaskId: null,
        plan: null,
        planId: '',
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        skillSlug: null,
        sortOrder: mockTask.sortOrder,
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
        wave: mockTask.wave,
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns PlanObject when plan exists', async () => {
      const mockPlan = {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        createdAt: new Date(FIXED_NOW),
        description: null,
        id: mockTask.planId,
        project: null,
        projectId: null,
        status: 'IN_PROGRESS',
        summary: null,
        title: 'Test plan',
        updatedAt: new Date(FIXED_NOW),
      };

      const planLoader = { load: vi.fn().mockResolvedValue(mockPlan) };
      const app = await Test.createTestingModule({
        providers: [
          TasksResolver,
          {
            provide: PlanRulesEvaluationService,
            useValue: createMock<PlanRulesEvaluationService>(),
          },
          {
            provide: TaggingEnqueueService,
            useValue: createMock<TaggingEnqueueService>(),
          },
          {
            provide: TaskPromotionEnqueueService,
            useValue: createMock<TaskPromotionEnqueueService>(),
          },
          {
            provide: TasksLoaders,
            useValue: createMock<TasksLoaders>({
              planLoader,
              projectLoader: { load: vi.fn() },
            }),
          },
          {
            provide: NotificationsService,
            useValue: createMock<NotificationsService>(),
          },
          {
            provide: PlanStatusService,
            useValue: createMock<PlanStatusService>(),
          },
          { provide: PlanTaskOrderService, useValue: mockPlanTaskOrderService },
          {
            provide: TasksRepository,
            useValue: createTasksRepositoryMock(),
          },
          { provide: DataSource, useValue: {} },
          {
            provide: WorkLedgerCaptureService,
            useValue: createMock<WorkLedgerCaptureService>(),
          },
        ],
      }).compile();
      const r = app.get<TasksResolver>(TasksResolver);

      const parent = {
        assignee: null,
        category: mockTask.category,
        completedAt: null,
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        hookRole: null,
        hookScope: null,
        hookSource: null,
        id: mockTask.id,
        parentTaskId: null,
        plan: null,
        planId: mockTask.planId,
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        skillSlug: null,
        sortOrder: mockTask.sortOrder,
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
        wave: mockTask.wave,
      };

      const result = await r.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTask.planId);
      expect(result?.title).toBe('Test plan');
    });

    test('returns null when plan not found', async () => {
      const planLoader = { load: vi.fn().mockResolvedValue(null) };

      const app = await Test.createTestingModule({
        providers: [
          TasksResolver,
          {
            provide: PlanRulesEvaluationService,
            useValue: createMock<PlanRulesEvaluationService>(),
          },
          {
            provide: TaggingEnqueueService,
            useValue: createMock<TaggingEnqueueService>(),
          },
          {
            provide: TaskPromotionEnqueueService,
            useValue: createMock<TaskPromotionEnqueueService>(),
          },
          {
            provide: TasksLoaders,
            useValue: createMock<TasksLoaders>({
              planLoader,
              projectLoader: { load: vi.fn() },
            }),
          },
          {
            provide: NotificationsService,
            useValue: createMock<NotificationsService>(),
          },
          {
            provide: PlanStatusService,
            useValue: createMock<PlanStatusService>(),
          },
          { provide: PlanTaskOrderService, useValue: mockPlanTaskOrderService },
          {
            provide: TasksRepository,
            useValue: createTasksRepositoryMock(),
          },
          { provide: DataSource, useValue: {} },
          {
            provide: WorkLedgerCaptureService,
            useValue: createMock<WorkLedgerCaptureService>(),
          },
        ],
      }).compile();
      const r = app.get<TasksResolver>(TasksResolver);

      const parent = {
        assignee: null,
        category: mockTask.category,
        completedAt: null,
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        hookRole: null,
        hookScope: null,
        hookSource: null,
        id: mockTask.id,
        parentTaskId: null,
        plan: null,
        planId: 'missing-plan-id',
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        skillSlug: null,
        sortOrder: mockTask.sortOrder,
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
        wave: mockTask.wave,
      };

      const result = await r.plan(parent);

      expect(result).toBeNull();
    });
  });

  describe('updateTask — parent plan IN_PROGRESS sync', () => {
    test('calls sync and emits plan status when task enters IN_PROGRESS and plan was promoted', async () => {
      const planId = mockTask.planId;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'PENDING',
      });
      vi.mocked(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).mockResolvedValue(true);
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'IN_PROGRESS' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'IN_PROGRESS',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledWith(
        planId,
        { actorKind: undefined, actorSub: undefined },
        true,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({
        planId,
        status: 'IN_PROGRESS',
      });
    });

    test('calls sync but does not emit when plan was already IN_PROGRESS (idempotent no-op)', async () => {
      const planId = mockTask.planId;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'PENDING',
      });
      vi.mocked(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).mockResolvedValue(false);
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'IN_PROGRESS' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'IN_PROGRESS',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledWith(
        planId,
        { actorKind: undefined, actorSub: undefined },
        true,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).not.toHaveBeenCalled();
    });

    test('does not call sync when task was already IN_PROGRESS', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'IN_PROGRESS' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'in_progress',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).not.toHaveBeenCalled();
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).not.toHaveBeenCalled();
    });

    test('does not call sync when status does not transition to IN_PROGRESS', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'PENDING',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'COMPLETED' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'COMPLETED',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateTask — completedAt write path', () => {
    test('stamps completedAt when transitioning into COMPLETED', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        completedAt: null,
        status: 'IN_PROGRESS',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve(entity),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'COMPLETED',
        summary: undefined,
        title: undefined,
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
          status: 'COMPLETED',
        }),
      );
    });

    test('does not overwrite completedAt when already COMPLETED and status stays COMPLETED', async () => {
      const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        completedAt: existingCompletedAt,
        status: 'COMPLETED',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve(entity),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'COMPLETED',
        summary: undefined,
        title: 'Edited title',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: existingCompletedAt,
          status: 'COMPLETED',
          title: 'Edited title',
        }),
      );
    });

    test('clears completedAt when leaving COMPLETED', async () => {
      const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        completedAt: existingCompletedAt,
        status: 'COMPLETED',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve(entity),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'IN_PROGRESS',
        summary: undefined,
        title: undefined,
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: null,
          status: 'IN_PROGRESS',
        }),
      );
    });
  });

  describe('updateTask — parent plan COMPLETED reconcile', () => {
    test('completes the plan and emits when the last task completes', async () => {
      const planId = mockTask.planId;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      vi.mocked(
        mockPlanStatusService.completeParentPlanIfTasksDone,
      ).mockResolvedValue(true);
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'COMPLETED' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'COMPLETED',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.completeParentPlanIfTasksDone,
      ).toHaveBeenCalledWith(planId, {
        actorKind: undefined,
        actorSub: undefined,
      });
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({
        planId,
        status: 'COMPLETED',
      });
    });

    test('reconciles but does not emit when tasks remain (plan unchanged)', async () => {
      const planId = mockTask.planId;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      vi.mocked(
        mockPlanStatusService.completeParentPlanIfTasksDone,
      ).mockResolvedValue(false);
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'COMPLETED' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'COMPLETED',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.completeParentPlanIfTasksDone,
      ).toHaveBeenCalledWith(planId, {
        actorKind: undefined,
        actorSub: undefined,
      });
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).not.toHaveBeenCalled();
    });

    test('does not reconcile when task was already COMPLETED', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'COMPLETED',
      });
      vi.mocked(repo.save).mockImplementation(async (entity: Task) =>
        Promise.resolve({ ...entity, status: 'COMPLETED' }),
      );

      await resolver.updateTask({
        assignee: undefined,
        category: undefined,
        description: undefined,
        id: mockTask.id,
        planId: undefined,
        project: undefined,
        projectId: undefined,
        requirements: undefined,
        sortOrder: undefined,
        status: 'completed',
        summary: undefined,
        title: undefined,
      });

      expect(
        mockPlanStatusService.completeParentPlanIfTasksDone,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createTask — sortOrder', () => {
    const planId = mockTask.planId;

    test('auto-assigns sortOrder via resolveNextSortOrder when omitted', async () => {
      vi.mocked(mockTasksRepository.resolveNextSortOrder).mockResolvedValue(
        3000,
      );
      vi.mocked(repo.save).mockResolvedValue({
        ...mockTask,
        sortOrder: 3000,
      });

      await resolver.createTask({
        assignee: null,
        category: null,
        description: null,
        planId,
        project: null,
        projectId: null,
        requirements: null,
        sortOrder: null,
        status: 'PENDING',
        summary: null,
        title: 'Appended task',
        wave: null,
      });

      expect(mockTasksRepository.resolveNextSortOrder).toHaveBeenCalledWith(
        planId,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 3000 }),
      );
    });

    test('uses explicit sortOrder when provided', async () => {
      vi.mocked(repo.save).mockResolvedValue({
        ...mockTask,
        sortOrder: 1500,
      });

      await resolver.createTask({
        assignee: null,
        category: null,
        description: null,
        planId,
        project: null,
        projectId: null,
        requirements: null,
        sortOrder: 1500,
        status: 'PENDING',
        summary: null,
        title: 'Inserted task',
        wave: null,
      });

      expect(mockTasksRepository.resolveNextSortOrder).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 1500 }),
      );
    });

    test('throws ConflictException on sortOrder unique violation', async () => {
      const uniqueError = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );
      vi.mocked(repo.save).mockRejectedValue(uniqueError);

      await expect(
        resolver.createTask({
          assignee: null,
          category: null,
          description: null,
          planId,
          project: null,
          projectId: null,
          requirements: null,
          sortOrder: 1000,
          status: 'PENDING',
          summary: null,
          title: 'Duplicate slot',
          wave: null,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createTask — requirements parsing', () => {
    const planId = mockTask.planId;

    const baseInput = {
      assignee: null,
      category: null,
      description: null,
      planId,
      project: null,
      projectId: null,
      sortOrder: 1000,
      status: 'PENDING',
      summary: null,
      title: 'Requirements task',
      wave: null,
    };

    test('throws BadRequestException on malformed requirements JSON', async () => {
      await expect(
        resolver.createTask({ ...baseInput, requirements: '{not json' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('throws BadRequestException when requirements JSON is not an array', async () => {
      await expect(
        resolver.createTask({ ...baseInput, requirements: '{"a":1}' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('parses a valid requirements JSON array', async () => {
      vi.mocked(repo.save).mockResolvedValue(mockTask);

      await resolver.createTask({
        ...baseInput,
        requirements: '["one","two"]',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ requirements: ['one', 'two'] }),
      );
    });

    test('treats null requirements as an empty array', async () => {
      vi.mocked(repo.save).mockResolvedValue(mockTask);

      await resolver.createTask({ ...baseInput, requirements: null });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ requirements: [] }),
      );
    });
  });

  describe('updateTask — requirements parsing', () => {
    test('throws BadRequestException on malformed requirements JSON', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(mockTask);

      await expect(
        resolver.updateTask({
          assignee: undefined,
          category: undefined,
          description: undefined,
          id: mockTask.id,
          planId: null,
          project: undefined,
          projectId: undefined,
          requirements: 'not-json',
          sortOrder: null,
          status: null,
          summary: undefined,
          title: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('createTask — parent plan IN_PROGRESS sync', () => {
    test('calls sync and emits when new task is created as IN_PROGRESS and plan was promoted', async () => {
      const planId = mockTask.planId;
      vi.mocked(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).mockResolvedValue(true);
      vi.mocked(repo.save).mockResolvedValue({
        ...mockTask,
        id: 'new-task-id',
        planId,
        status: 'IN_PROGRESS',
      });

      await resolver.createTask({
        assignee: null,
        category: null,
        description: null,
        planId,
        project: null,
        projectId: null,
        requirements: null,
        sortOrder: null,
        status: 'IN_PROGRESS',
        summary: null,
        title: 'New task',
        wave: null,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledWith(
        planId,
        { actorKind: undefined, actorSub: undefined },
        true,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({ planId, status: 'IN_PROGRESS' });
    });

    test('does not call sync when created task is not IN_PROGRESS', async () => {
      const planId = mockTask.planId;
      vi.mocked(repo.save).mockResolvedValue({
        ...mockTask,
        id: 'new-task-id',
        planId,
        status: 'PENDING',
      });

      await resolver.createTask({
        assignee: null,
        category: null,
        description: null,
        planId,
        project: null,
        projectId: null,
        requirements: null,
        sortOrder: null,
        status: 'PENDING',
        summary: null,
        title: 'Queued task',
        wave: null,
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createTasks — parent plan IN_PROGRESS sync', () => {
    test('promotes the plan and emits when any created task is IN_PROGRESS', async () => {
      const planId = mockTask.planId;
      vi.mocked(mockTasksRepository.createTasksBatch).mockResolvedValue([
        { ...mockTask, id: 'new-task-1', planId, status: 'IN_PROGRESS' },
      ]);
      vi.mocked(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).mockResolvedValue(true);

      await resolver.createTasks({
        planId,
        tasks: [
          {
            assignee: null,
            category: null,
            description: null,
            project: null,
            projectId: null,
            requirements: null,
            sortOrder: null,
            status: 'IN_PROGRESS',
            summary: null,
            title: 'New task',
            wave: null,
          },
        ],
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).toHaveBeenCalledWith(
        planId,
        { actorKind: undefined, actorSub: undefined },
        true,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({ planId, status: 'IN_PROGRESS' });
    });

    test('does not promote when no created task is IN_PROGRESS', async () => {
      const planId = mockTask.planId;
      vi.mocked(mockTasksRepository.createTasksBatch).mockResolvedValue([
        { ...mockTask, id: 'new-task-1', planId, status: 'PENDING' },
      ]);

      await resolver.createTasks({
        planId,
        tasks: [
          {
            assignee: null,
            category: null,
            description: null,
            project: null,
            projectId: null,
            requirements: null,
            sortOrder: null,
            status: 'PENDING',
            summary: null,
            title: 'Queued task',
            wave: null,
          },
        ],
      });

      expect(
        mockPlanStatusService.promoteParentPlanToInProgress,
      ).not.toHaveBeenCalled();
    });

    test('announces the new rows with plan.updated so an open plan view refreshes', async () => {
      const planId = mockTask.planId;
      vi.mocked(mockTasksRepository.createTasksBatch).mockResolvedValue([
        { ...mockTask, id: 'new-task-1', planId, status: 'PENDING' },
        { ...mockTask, id: 'new-task-2', planId, status: 'PENDING' },
      ]);

      await resolver.createTasks({ planId, tasks: [] });

      expect(mockNotificationsService.emitPlanUpdated).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.emitPlanUpdated).toHaveBeenCalledWith({
        message: '2 task(s) created',
        planId,
        severity: 'info',
      });
    });

    test('publishes nothing when the batch fails', async () => {
      vi.mocked(mockTasksRepository.createTasksBatch).mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        resolver.createTasks({ planId: mockTask.planId, tasks: [] }),
      ).rejects.toThrow('boom');

      expect(mockNotificationsService.emitPlanUpdated).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    test("announces the removal on the task's plan", async () => {
      vi.mocked(repo.findOne).mockResolvedValue(mockTask);
      vi.mocked(repo.delete).mockResolvedValue({ affected: 1, raw: [] });

      await expect(resolver.deleteTask({ id: mockTask.id })).resolves.toBe(
        true,
      );

      expect(mockNotificationsService.emitPlanUpdated).toHaveBeenCalledWith({
        message: `Task deleted: ${mockTask.title}`,
        planId: mockTask.planId,
        severity: 'info',
      });
    });

    test('publishes nothing when no row was deleted', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);
      vi.mocked(repo.delete).mockResolvedValue({ affected: 0, raw: [] });

      await expect(resolver.deleteTask({ id: 'missing' })).resolves.toBe(false);

      expect(mockNotificationsService.emitPlanUpdated).not.toHaveBeenCalled();
    });
  });

  describe('reorderPlanTasks', () => {
    test('delegates to the plan task order service', async () => {
      vi.mocked(mockPlanTaskOrderService.reorderTasks).mockResolvedValue([
        mockTask,
      ]);

      await expect(
        resolver.reorderPlanTasks({
          planId: mockTask.planId,
          taskIds: [mockTask.id],
        }),
      ).resolves.toEqual([mockTask]);
      expect(mockPlanTaskOrderService.reorderTasks).toHaveBeenCalledWith(
        mockTask.planId,
        [mockTask.id],
      );
    });
  });

  describe('hooks', () => {
    test('addHook plan-level before delegates to addBeforeHook', async () => {
      vi.mocked(mockTasksRepository.addBeforeHook).mockResolvedValue(mockTask);

      const result = await resolver.addHook({
        anchorTaskId: null,
        description: null,
        planId: mockTask.planId,
        role: 'before',
        scope: 'each',
        skillSlug: 'validate',
        source: 'skill',
        title: null,
      });

      expect(mockTasksRepository.addBeforeHook).toHaveBeenCalledWith(
        mockTask.planId,
        null,
        {
          description: null,
          scope: 'each',
          skillSlug: 'validate',
          source: 'skill',
          title: null,
        },
      );
      expect(result).toBe(mockTask);
    });

    test('addHook task-level after delegates to addAfterHook with the anchor', async () => {
      vi.mocked(mockTasksRepository.addAfterHook).mockResolvedValue(mockTask);

      await resolver.addHook({
        anchorTaskId: 'anchor',
        planId: 'plan-1',
        role: 'after',
        source: 'template',
      });

      expect(mockTasksRepository.addAfterHook).toHaveBeenCalledWith(
        'plan-1',
        'anchor',
        expect.objectContaining({ scope: undefined, source: 'template' }),
      );
    });

    test('addHook rejects an invalid role', async () => {
      await expect(
        resolver.addHook({ planId: 'p', role: 'sideways', source: 'template' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('addHook rejects an invalid source', async () => {
      await expect(
        resolver.addHook({ planId: 'p', role: 'before', source: 'bogus' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('addHook maps a service invariant error to a 400', async () => {
      vi.mocked(mockTasksRepository.addBeforeHook).mockRejectedValue(
        new Error("hook source 'skill' requires a skillSlug"),
      );

      await expect(
        resolver.addHook({ planId: 'p', role: 'before', source: 'skill' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('detachHook delegates to the service', async () => {
      vi.mocked(mockTasksRepository.detachHook).mockResolvedValue(true);

      const removed = await resolver.detachHook({ hookTaskId: 'hook-1' });

      expect(removed).toBe(true);
      expect(mockTasksRepository.detachHook).toHaveBeenCalledWith('hook-1');
    });

    test('beforeHooks/afterHooks resolve via getTaskHooks', async () => {
      const before = { ...mockTask, id: 'before-hook' };
      const after = { ...mockTask, id: 'after-hook' };
      vi.mocked(mockTasksRepository.getTaskHooks).mockResolvedValue({
        after: [after],
        before: [before],
      });
      const parent = {
        ...mockTask,
        plan: null,
        projectRelation: null,
        requirementsJson: '[]',
      };

      expect(await resolver.beforeHooks(parent)).toEqual([before]);
      expect(await resolver.afterHooks(parent)).toEqual([after]);
    });
  });
});
