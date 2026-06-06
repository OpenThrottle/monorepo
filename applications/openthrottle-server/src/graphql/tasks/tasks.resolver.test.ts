import {
  PLAN_TASK_LIST_ORDER,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Task } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { QueryFailedError } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { TasksLoaders } from './tasks-loaders';
import { TasksResolver } from './tasks.resolver';

describe('TasksResolver', () => {
  let resolver: TasksResolver;

  const transactionTaskRepo = {
    update: vi.fn().mockResolvedValue(undefined),
  };

  const repo = {
    count: vi.fn(),
    create: vi.fn((data: Record<string, unknown>) => ({
      ...data,
      id: (data.id as string | undefined) ?? 'generated-task-id',
    })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    manager: {
      transaction: vi.fn(
        async (
          work: (manager: {
            getRepository: () => typeof transactionTaskRepo;
          }) => unknown,
        ) =>
          work({
            getRepository: () => transactionTaskRepo,
          }),
      ),
    },
    save: vi.fn((entity: Task) => Promise.resolve(entity)),
  };

  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(repo),
    resolveNextSortOrder: vi.fn().mockResolvedValue(1000),
    syncParentPlanStatus: vi.fn().mockResolvedValue(false),
  });

  const mockNotificationsService = createMock<NotificationsService>({
    emitPlanStatusChanged: vi.fn(),
  });

  const mockLoaders = createMock<TasksLoaders>({
    planLoader: { load: vi.fn() },
    projectLoader: { load: vi.fn() },
  });

  const mockTask: Task = {
    assignee: null,
    category: 'testing',
    commitLinks: [],
    createdAt: new Date('2026-02-01T21:33:51.891Z'),
    description: 'Create TaskData type if needed',
    id: 'b366d480-6a4f-498b-8755-23ade25d2b24',
    plan: {
      assignee: null,
      author: 'Plan author',
      category: 'Plan category',
      commitLinks: [],
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
    },
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    project: null,
    projectId: null,
    projectRelation: null,
    requirements: [],
    sortOrder: 1000,
    status: 'pending',
    summary: null,
    taskEmbeddings: [],
    title: 'Add graphql/tasks/',
    updatedAt: new Date('2026-02-01T21:33:51.891Z'),
  } as Task;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TasksResolver,
        { provide: TasksLoaders, useValue: mockLoaders },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    resolver = app.get<TasksResolver>(TasksResolver);
  });

  beforeEach(() => {
    vi.mocked(mockTasksService.syncParentPlanStatus).mockReset();
    vi.mocked(mockTasksService.syncParentPlanStatus).mockResolvedValue(false);
    vi.mocked(mockTasksService.resolveNextSortOrder).mockReset();
    vi.mocked(mockTasksService.resolveNextSortOrder).mockResolvedValue(1000);
    vi.mocked(mockNotificationsService.emitPlanStatusChanged).mockClear();
    vi.mocked(repo.create).mockClear();
    vi.mocked(repo.save).mockClear();
    vi.mocked(repo.findOne).mockClear();
    vi.mocked(repo.find).mockClear();
    vi.mocked(transactionTaskRepo.update).mockClear();
    vi.mocked(repo.manager.transaction).mockClear();
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
      expect(
        JSON.stringify(
          (result as { requirements?: unknown[] }).requirements ?? [],
        ),
      ).toBe('[]');
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

    test('returns empty array when no tasks', async () => {
      vi.mocked(repo.find).mockResolvedValue([]);

      const result = await resolver.tasks();

      expect(result).toEqual([]);
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

    test('returns all tasks and totalCount when limit/offset omitted', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-2' }];
      vi.mocked(repo.find).mockResolvedValue(tasks);

      const result = await resolver.tasksByProjectId({
        limit: null,
        offset: null,
        projectId,
      });

      expect(result.tasks).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(repo.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { projectId },
      });
      expect(repo.count).not.toHaveBeenCalled();
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

      expect(result.tasks).toHaveLength(1);
      expect(result.totalCount).toBe(42);
      expect(repo.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
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
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        id: mockTask.id,
        plan: null,
        planId: '',
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns PlanObject when plan exists', async () => {
      const mockPlan = {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        createdAt: new Date(),
        description: null,
        id: mockTask.planId,
        project: null,
        projectId: null,
        status: 'IN_PROGRESS',
        summary: null,
        title: 'Test plan',
        updatedAt: new Date(),
      };

      const planLoader = { load: vi.fn().mockResolvedValue(mockPlan) };
      const app = await Test.createTestingModule({
        providers: [
          TasksResolver,
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
            provide: TasksService,
            useValue: createMock<TasksService>({
              getRepository: vi.fn().mockReturnValue({
                find: vi.fn(),
                findOne: vi.fn(),
              }),
            }),
          },
        ],
      }).compile();
      const r = app.get<TasksResolver>(TasksResolver);

      const parent = {
        assignee: null,
        category: mockTask.category,
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        id: mockTask.id,
        plan: null,
        planId: mockTask.planId,
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
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
            provide: TasksService,
            useValue: createMock<TasksService>({
              getRepository: vi.fn().mockReturnValue({
                find: vi.fn(),
                findOne: vi.fn(),
              }),
            }),
          },
        ],
      }).compile();
      const r = app.get<TasksResolver>(TasksResolver);

      const parent = {
        assignee: null,
        category: mockTask.category,
        createdAt: mockTask.createdAt,
        description: mockTask.description,
        id: mockTask.id,
        plan: null,
        planId: 'missing-plan-id',
        project: null,
        projectId: null,
        projectRelation: null,
        requirementsJson: '[]',
        status: mockTask.status,
        summary: mockTask.summary,
        title: mockTask.title,
        updatedAt: mockTask.updatedAt,
      };

      const result = await r.plan(parent);

      expect(result).toBeNull();
    });
  });

  describe('updateTask — parent plan IN_PROGRESS sync', () => {
    test('calls sync and emits plan status when task enters IN_PROGRESS and plan was promoted', async () => {
      const planId = mockTask.planId as string;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'PENDING',
      });
      vi.mocked(mockTasksService.syncParentPlanStatus).mockResolvedValue(true);
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

      expect(mockTasksService.syncParentPlanStatus).toHaveBeenCalledTimes(1);
      expect(mockTasksService.syncParentPlanStatus).toHaveBeenCalledWith(
        planId,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({
        planId,
        status: 'IN_PROGRESS',
      });
    });

    test('calls sync but does not emit when plan was already IN_PROGRESS (idempotent no-op)', async () => {
      const planId = mockTask.planId as string;
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockTask,
        status: 'PENDING',
      });
      vi.mocked(mockTasksService.syncParentPlanStatus).mockResolvedValue(false);
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

      expect(mockTasksService.syncParentPlanStatus).toHaveBeenCalledWith(
        planId,
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

      expect(mockTasksService.syncParentPlanStatus).not.toHaveBeenCalled();
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

      expect(mockTasksService.syncParentPlanStatus).not.toHaveBeenCalled();
    });
  });

  describe('createTask — sortOrder', () => {
    const planId = mockTask.planId as string;

    test('auto-assigns sortOrder via resolveNextSortOrder when omitted', async () => {
      vi.mocked(mockTasksService.resolveNextSortOrder).mockResolvedValue(3000);
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
      });

      expect(mockTasksService.resolveNextSortOrder).toHaveBeenCalledWith(
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
      });

      expect(mockTasksService.resolveNextSortOrder).not.toHaveBeenCalled();
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
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createTask — parent plan IN_PROGRESS sync', () => {
    test('calls sync and emits when new task is created as IN_PROGRESS and plan was promoted', async () => {
      const planId = mockTask.planId as string;
      vi.mocked(mockTasksService.syncParentPlanStatus).mockResolvedValue(true);
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
      });

      expect(mockTasksService.syncParentPlanStatus).toHaveBeenCalledTimes(1);
      expect(mockTasksService.syncParentPlanStatus).toHaveBeenCalledWith(
        planId,
      );
      expect(
        mockNotificationsService.emitPlanStatusChanged,
      ).toHaveBeenCalledWith({ planId, status: 'IN_PROGRESS' });
    });

    test('does not call sync when created task is not IN_PROGRESS', async () => {
      const planId = mockTask.planId as string;
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
      });

      expect(mockTasksService.syncParentPlanStatus).not.toHaveBeenCalled();
    });
  });

  describe('reorderPlanTasks', () => {
    const planId = mockTask.planId as string;
    const taskA = { ...mockTask, id: 'task-a', sortOrder: 2000, title: 'A' };
    const taskB = {
      ...mockTask,
      createdAt: new Date('2026-02-02T21:33:51.891Z'),
      id: 'task-b',
      sortOrder: 1000,
      title: 'B',
    };

    test('returns empty array when taskIds is empty', async () => {
      const result = await resolver.reorderPlanTasks({ planId, taskIds: [] });

      expect(result).toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });

    test('throws when taskIds contain duplicates', async () => {
      await expect(
        resolver.reorderPlanTasks({
          planId,
          taskIds: [taskA.id, taskA.id],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('throws when a taskId does not belong to the plan', async () => {
      vi.mocked(repo.find).mockResolvedValue([taskA]);

      await expect(
        resolver.reorderPlanTasks({
          planId,
          taskIds: [taskA.id, taskB.id],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('renumbers sortOrder 1000, 2000 in taskIds order inside a transaction', async () => {
      vi.mocked(repo.find).mockResolvedValue([taskA, taskB]);

      const result = await resolver.reorderPlanTasks({
        planId,
        taskIds: [taskA.id, taskB.id],
      });

      expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(transactionTaskRepo.update).toHaveBeenCalledWith(taskA.id, {
        sortOrder: 1_000_000,
      });
      expect(transactionTaskRepo.update).toHaveBeenCalledWith(taskB.id, {
        sortOrder: 1_000_001,
      });
      expect(transactionTaskRepo.update).toHaveBeenCalledWith(taskA.id, {
        sortOrder: 1000,
      });
      expect(transactionTaskRepo.update).toHaveBeenCalledWith(taskB.id, {
        sortOrder: 2000,
      });
      expect(result).toEqual([
        { ...taskA, sortOrder: 1000 },
        { ...taskB, sortOrder: 2000 },
      ]);
    });
  });
});
