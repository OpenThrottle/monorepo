import { createMock } from '@golevelup/ts-vitest';
import {
  getDefaultPlanRunConfigStorage,
  PlansService,
  PlanRunsService,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { Plan, Task } from '@openthrottle/nestjs-repositories';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { PlanCreationService } from '../../services/plan-creation/plan-creation.service';
import { PlanEnqueueService } from './plan-enqueue.service';
import { PlanStatusService } from './plan-status.service';
import {
  CreatePlanInput,
  ListPlansByStatusInput,
  PlanRalphWorkflowModeGraphQL,
  UpdatePlanInput,
} from './plan.input';
import { PlansLoaders } from './plans-loaders';
import { PlansResolver } from './plans.resolver';

vi.mock('@openthrottle/ai-mcp/src/cortex-server', () => ({
  getPostgresConfig: vi.fn(),
  searchPlansBySemanticQuery: vi.fn(),
}));

const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE =
  'Cannot transition to IN_PROGRESS: only PENDING, QUEUED, or already IN_PROGRESS plans may enter this state.';

describe('PlansResolver', () => {
  let resolver: PlansResolver;
  let plansService: PlansService;

  const mockPlan: Plan = {
    assignee: null,
    author: 'visormatt',
    category: 'openthrottle-server',
    createdAt: new Date('2026-02-01T19:57:37.738Z'),
    description: 'A test plan',
    id: '80864bba-630a-451d-bfd2-4b25ec202381',
    jobRunHooks: { hooks: [] },
    project: null,
    projectId: null,
    runConfig: getDefaultPlanRunConfigStorage({
      planId: '80864bba-630a-451d-bfd2-4b25ec202381',
    }),
    status: 'pending',
    summary: null,
    title: 'Test plan',
    updatedAt: new Date('2026-02-01T19:59:19.440Z'),
  } as Plan;

  function createQueryBuilderMock(
    getManyAndCountResult: [Plan[], number] = [[], 0],
  ) {
    const andWhere = vi.fn().mockReturnThis();
    const orderBy = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const take = vi.fn().mockReturnThis();
    const getManyAndCount = vi.fn().mockResolvedValue(getManyAndCountResult);
    const chain = {
      andWhere,
      getManyAndCount,
      orderBy,
      select,
      skip,
      take,
    };
    return { andWhere, chain, getManyAndCount, orderBy, select, skip, take };
  }

  const repo = {
    create: vi.fn(),
    createQueryBuilder: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    // Mirrors repo.manager.transaction: runs the callback with a manager whose getRepository
    // routes Plan -> plans repo and Task -> taskRepo. Rejections propagate so the enqueue tests can
    // assert rollback (the BullMQ add, which runs after the transaction, is never reached).
    manager: {
      transaction: vi.fn(
        async (
          cb: (manager: {
            getRepository: (entity: unknown) => unknown;
          }) => unknown,
        ) =>
          cb({
            getRepository: (entity: unknown) =>
              entity === Task ? taskRepo : repo,
          }),
      ),
    },
    save: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockPlanCreationService = {
    createPlanFromInput: vi.fn(),
  };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(repo),
  });

  const mockProjectsService = createMock<ProjectsService>({
    findById: vi.fn(),
  });

  const mockProjectLoad = vi.fn().mockResolvedValue(null);
  const mockTaskCountLoad = vi.fn().mockResolvedValue(0);
  const mockPlansLoaders: PlansLoaders = {
    projectLoader: { load: mockProjectLoad },
    taskCountByPlanIdLoader: { load: mockTaskCountLoad },
  } as unknown as PlansLoaders;

  const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1', name: 'run-plan' });
  const mockGetWaitingCount = vi.fn().mockResolvedValue(1);
  const mockGetJobs = vi
    .fn()
    .mockResolvedValue([{ id: 'job-1', name: 'run-plan' }]);

  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    add: mockAdd,
    getJobs: mockGetJobs,
    getWaitingCount: mockGetWaitingCount,
  });

  // updateMatchingTasksAndEmitStatusChanged now runs a single `UPDATE ... RETURNING id` query
  // builder; mock the chain and let tests drive what RETURNING yields via mockTaskUpdateExecute.
  const mockTaskUpdateExecute = vi
    .fn()
    .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });
  const mockTaskUpdateQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: mockTaskUpdateExecute,
    returning: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepo = {
    createQueryBuilder: vi.fn(() => mockTaskUpdateQueryBuilder),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(taskRepo),
  });

  const mockEmitTaskStatusChanged = vi.fn();
  const mockNotificationsService = createMock<NotificationsService>({
    emitPlanEnqueued: vi.fn(),
    emitTaskStatusChanged: mockEmitTaskStatusChanged,
  });

  const mockPlanRunCancellationAbort = vi.fn().mockReturnValue(false);
  const mockRecordQueuedRun = vi.fn().mockResolvedValue({});
  const mockFindRecentByPlanId = vi.fn().mockResolvedValue([]);
  const mockPlanRunsService = createMock<PlanRunsService>({
    findRecentByPlanId: mockFindRecentByPlanId,
    recordQueuedRun: mockRecordQueuedRun,
  });

  // Enqueue mechanics now live in PlanEnqueueService (covered by plan-enqueue.service.test.ts);
  // the resolver only validates input, delegates, and maps the outcome — so mock the service here.
  const sampleEnqueueOutcome = {
    executionBackend: 'cursor' as const,
    jobId: 'job-enqueue-1',
    planId: mockPlan.id,
    queuePosition: 1,
    queueTotal: 1,
  };
  const mockEnqueueSpawn = vi.fn().mockResolvedValue(sampleEnqueueOutcome);
  const mockEnqueueOrchestrator = vi
    .fn()
    .mockResolvedValue(sampleEnqueueOutcome);
  const mockPlanEnqueueService = createMock<PlanEnqueueService>({
    enqueueOrchestrator: mockEnqueueOrchestrator,
    enqueueSpawn: mockEnqueueSpawn,
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlansResolver,
        { provide: PlansLoaders, useValue: mockPlansLoaders },
        {
          provide: PlanCreationService,
          useValue: mockPlanCreationService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PlanRunCancellationService,
          useValue: { abort: mockPlanRunCancellationAbort },
        },
        { provide: PlanEnqueueService, useValue: mockPlanEnqueueService },
        // Real PlanStatusService wired to the existing mocks: updatePlan's merge + transition
        // policy orchestration is exercised end-to-end here; the focused setStatus/cancelRun/policy
        // unit coverage lives in plan-status.service.test.ts.
        PlanStatusService,
        { provide: PlanRunsService, useValue: mockPlanRunsService },
        { provide: PlansService, useValue: mockPlansService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: TasksService, useValue: mockTasksService },
        {
          provide: getQueueToken(PLANS_QUEUE_NAME),
          useValue: mockPlansQueue,
        },
      ],
    }).compile();

    resolver = app.get<PlansResolver>(PlansResolver);
    plansService = app.get<PlansService>(PlansService);
  });

  describe('plan', () => {
    test('returns PlanObject when plan exists', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.plan(mockPlan.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
      expect(result?.author).toBe(mockPlan.author);
      expect(result?.category).toBe(mockPlan.category);
      expect(result?.description).toBe(mockPlan.description);
      expect(result?.status).toBe(mockPlan.status);
      expect(result?.createdAt).toEqual(mockPlan.createdAt);
      expect(result?.updatedAt).toEqual(mockPlan.updatedAt);
    });

    test('returns plan with projectId and projectRelation null when plan has no project', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.plan(mockPlan.id);

      expect(result).not.toBeNull();
      expect(result?.projectId).toBeNull();
      const projectRelation = await resolver.projectRelation(result!);
      expect(projectRelation).toBeNull();
    });

    test('returns null when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const result = await resolver.plan('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('plans', () => {
    test('returns array of PlanObjects', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([mockPlan]);

      const result = await resolver.plans();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockPlan.id);
      expect(result[0]?.title).toBe(mockPlan.title);
    });

    test('returns empty array when no plans', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      const result = await resolver.plans();

      expect(result).toEqual([]);
    });

    test('applies a default take cap when no limit is provided', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      await resolver.plans();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    test('honors an explicit limit', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      await resolver.plans(5);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    test('clamps an oversized limit to the max', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      await resolver.plans(10000);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });

    test('clamps a non-positive limit to at least 1', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.find).mockResolvedValue([]);

      await resolver.plans(0);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });

  describe('relation fields (batched via loaders)', () => {
    test('projectRelation resolves through projectLoader when projectId is set', async () => {
      const project = { id: 'proj-1', name: 'Demo' };
      mockProjectLoad.mockResolvedValueOnce(project);

      const result = await resolver.projectRelation({
        ...mockPlan,
        projectId: 'proj-1',
      } as Plan);

      expect(mockProjectLoad).toHaveBeenCalledWith('proj-1');
      expect(result).toBe(project);
    });

    test('projectRelation returns null without hitting the loader when projectId is unset', async () => {
      mockProjectLoad.mockClear();

      const result = await resolver.projectRelation(mockPlan);

      expect(result).toBeNull();
      expect(mockProjectLoad).not.toHaveBeenCalled();
    });

    test('taskCount resolves through taskCountByPlanIdLoader', async () => {
      mockTaskCountLoad.mockResolvedValueOnce(7);

      const result = await resolver.taskCount(mockPlan);

      expect(mockTaskCountLoad).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toBe(7);
    });
  });

  describe('listPlansByStatus', () => {
    test('returns plans and totalCount from query builder (no filters)', async () => {
      const [entities, count] = [[mockPlan as Plan], 1];
      const qbMock = createQueryBuilderMock([entities, count]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(
        qbMock.chain as unknown as ReturnType<typeof repo.createQueryBuilder>,
      );

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        statuses: null,
        titleSubstring: null,
      };

      const result = await resolver.listPlansByStatus(input);

      expect(result.plans).toHaveLength(1);
      expect(result.plans[0]?.id).toBe(mockPlan.id);
      expect(result.totalCount).toBe(1);
      expect(qbMock.getManyAndCount).toHaveBeenCalled();
      expect(qbMock.andWhere).not.toHaveBeenCalled();
    });

    test('adds status filter and returns filtered result when statuses passed', async () => {
      const statuses = ['IN_PROGRESS', 'PENDING'];
      const [entities, count] = [[mockPlan as Plan], 1];
      const qbMock = createQueryBuilderMock([entities, count]);
      const repo = plansService.getRepository();

      vi.mocked(repo.createQueryBuilder).mockReturnValue(
        qbMock.chain as unknown as ReturnType<typeof repo.createQueryBuilder>,
      );

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        statuses,
        titleSubstring: null,
      };

      const result = await resolver.listPlansByStatus(input);

      expect(result.plans).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'plan.status IN (:status_0, :status_1)',
        { status_0: 'IN_PROGRESS', status_1: 'PENDING' },
      );
    });

    test('adds assignee filter when assignees passed', async () => {
      const assignees = ['visormatt'];
      const qbMock = createQueryBuilderMock([[], 0]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(
        qbMock.chain as unknown as ReturnType<typeof repo.createQueryBuilder>,
      );

      const input: ListPlansByStatusInput = {
        assignees,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        statuses: null,
        titleSubstring: null,
      };

      await resolver.listPlansByStatus(input);

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(plan.author IN (:assignee_0) OR plan.assignee IN (:assignee_0))',
        { assignee_0: 'visormatt' },
      );
    });

    test('adds titleSubstring and project filters when passed', async () => {
      const qbMock = createQueryBuilderMock([[], 0]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(
        qbMock.chain as unknown as ReturnType<typeof repo.createQueryBuilder>,
      );

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: 'my-project',
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        statuses: null,
        titleSubstring: 'foo',
      };

      await resolver.listPlansByStatus(input);

      expect(qbMock.andWhere).toHaveBeenCalledWith('plan.project = :project', {
        project: 'my-project',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'plan.title ILIKE :titlePattern',
        { titlePattern: '%foo%' },
      );
    });
  });

  describe('searchPlans', () => {
    test('returns empty result when Cortex config is not set', async () => {
      const { getPostgresConfig } =
        await import('@openthrottle/ai-mcp/src/cortex-server');

      vi.mocked(getPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });

      const result = await resolver.searchPlans({
        limit: 10,
        query: 'some query',
      });

      expect(result.plans).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    test('returns mapped plans when semantic search returns results', async () => {
      const { getPostgresConfig, searchPlansBySemanticQuery } =
        await import('@openthrottle/ai-mcp/src/cortex-server');
      vi.mocked(getPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/cortex',
      });
      vi.mocked(searchPlansBySemanticQuery).mockResolvedValue({
        plans: [
          {
            assignee: null,
            author: 'visormatt',
            category: 'cortex',
            createdAt: '2026-02-01T19:57:37.738Z',
            id: '80864bba-630a-451d-bfd2-4b25ec202381',
            project: null,
            projectId: null,
            status: 'pending',
            summary: null,
            title: 'Test plan',
            updatedAt: '2026-02-01T19:59:19.440Z',
          },
        ],
        totalCount: 1,
      });

      const result = await resolver.searchPlans({
        limit: 10,
        query: 'test',
      });

      expect(result.plans).toHaveLength(1);
      expect(result.plans[0]?.id).toBe('80864bba-630a-451d-bfd2-4b25ec202381');
      expect(result.plans[0]?.title).toBe('Test plan');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('enqueuePlanRun', () => {
    beforeEach(() => {
      mockEnqueueSpawn.mockClear();
      mockEnqueueSpawn.mockResolvedValue(sampleEnqueueOutcome);
    });

    test('delegates to PlanEnqueueService.enqueueSpawn and maps the outcome', async () => {
      const result = await resolver.enqueuePlanRun({
        idempotencyKey: 'caller-key',
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: 5,
        ralph: null,
        workingDirectory: null,
      });

      expect(mockEnqueueSpawn).toHaveBeenCalledWith({
        idempotencyKey: 'caller-key',
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: 5,
        ralph: null,
        workingDirectory: null,
      });
      expect(result).toEqual(
        expect.objectContaining({
          executionBackend: 'cursor',
          jobId: sampleEnqueueOutcome.jobId,
          planId: mockPlan.id,
          queuePosition: sampleEnqueueOutcome.queuePosition,
          queueTotal: sampleEnqueueOutcome.queueTotal,
        }),
      );
    });

    test('maps an omitted idempotency key to null when delegating', async () => {
      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockEnqueueSpawn).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: null, planId: mockPlan.id }),
      );
    });
  });

  describe('workflowPlanRun', () => {
    beforeEach(() => {
      mockEnqueueSpawn.mockClear();
      mockEnqueueSpawn.mockResolvedValue(sampleEnqueueOutcome);
    });

    test('delegates to enqueuePlanRun (enqueueSpawn) with an equivalent result', async () => {
      const input = {
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        workingDirectory: null,
      };

      const viaCanonical = await resolver.enqueuePlanRun(input);
      const viaAlias = await resolver.workflowPlanRun(input);

      expect(mockEnqueueSpawn).toHaveBeenCalledTimes(2);
      expect(viaAlias.jobId).toBe(viaCanonical.jobId);
      expect(viaAlias.planId).toBe(viaCanonical.planId);
    });
  });

  describe('enqueuePlanRalphOrchestrator', () => {
    beforeEach(() => {
      mockEnqueueOrchestrator.mockClear();
      mockEnqueueOrchestrator.mockResolvedValue(sampleEnqueueOutcome);
      taskRepo.findOne.mockReset();
      taskRepo.findOne.mockResolvedValue(null);
    });

    test('delegates to PlanEnqueueService.enqueueOrchestrator and maps the outcome', async () => {
      const result = await resolver.enqueuePlanRalphOrchestrator({
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(mockEnqueueOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: null,
          planId: mockPlan.id,
          taskId: null,
        }),
      );
      expect(result.jobId).toBe(sampleEnqueueOutcome.jobId);
    });

    test('requires taskId when mode is task (no delegation)', async () => {
      await expect(
        resolver.enqueuePlanRalphOrchestrator({
          idempotencyKey: null,
          mode: PlanRalphWorkflowModeGraphQL.task,
          planId: mockPlan.id,
          priority: null,
          ralph: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEnqueueOrchestrator).not.toHaveBeenCalled();
    });

    test('validates the task belongs to the plan and forwards task mode', async () => {
      taskRepo.findOne.mockResolvedValueOnce({
        id: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
        planId: mockPlan.id,
      } as never);

      await resolver.enqueuePlanRalphOrchestrator({
        idempotencyKey: null,
        mode: PlanRalphWorkflowModeGraphQL.task,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
        workingDirectory: null,
      });

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
          planId: mockPlan.id,
        },
      });
      expect(mockEnqueueOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'task',
          taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
        }),
      );
    });

    test('throws when the task is not found for task mode (no delegation)', async () => {
      taskRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        resolver.enqueuePlanRalphOrchestrator({
          idempotencyKey: null,
          mode: PlanRalphWorkflowModeGraphQL.task,
          planId: mockPlan.id,
          priority: null,
          ralph: null,
          taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
          workingDirectory: null,
        }),
      ).rejects.toThrow(/Task not found for this plan/);
      expect(mockEnqueueOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe('planRunsByPlanId', () => {
    test('returns recent persisted run audit rows with execution backend', async () => {
      const createdAt = new Date('2026-05-09T12:00:00.000Z');
      const updatedAt = new Date('2026-05-09T12:01:00.000Z');
      mockFindRecentByPlanId.mockResolvedValueOnce([
        {
          bullmqJobId: 'job-claude-1',
          createdAt,
          executionBackend: 'claude',
          id: 'run-1',
          planId: mockPlan.id,
          queueName: PLANS_QUEUE_NAME,
          runConfigSnapshot: {
            ralph: { executionBackend: 'claude', iterations: 3 },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '' },
          },
          runKind: 'spawn',
          status: 'QUEUED',
          updatedAt,
        },
      ]);

      const result = await resolver.planRunsByPlanId({
        limit: 5,
        planId: mockPlan.id,
      });

      expect(mockFindRecentByPlanId).toHaveBeenCalledWith(mockPlan.id, 5);
      expect(result).toEqual([
        expect.objectContaining({
          bullmqJobId: 'job-claude-1',
          executionBackend: 'claude',
          planId: mockPlan.id,
          runConfigSnapshotJson: expect.stringContaining('"iterations":3'),
        }),
      ]);
    });
  });

  describe('createPlan', () => {
    test('creates plan from input and returns PlanObject', async () => {
      const input: CreatePlanInput = {
        assignee: null,
        author: 'visormatt',
        category: 'openthrottle-server',
        description: null,
        project: null,
        projectId: null,
        status: null,
        summary: null,
        title: 'New plan',
      };
      const created = {
        ...mockPlan,
        createdAt: new Date(),
        id: 'new-id',
        title: input.title,
        updatedAt: new Date(),
      };
      mockPlanCreationService.createPlanFromInput.mockResolvedValue(
        created as Plan,
      );

      const result = await resolver.createPlan(input);

      expect(mockPlanCreationService.createPlanFromInput).toHaveBeenCalledWith(
        input,
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('new-id');
      expect(result?.title).toBe(input.title);
    });

    test('creates plan with projectId null when projectId omitted', async () => {
      const input = {
        assignee: null,
        author: 'visormatt',
        category: 'openthrottle-server',
        description: null,
        project: null,
        status: null,
        summary: null,
        title: 'Plan without project',
      } as CreatePlanInput;
      const created = {
        ...mockPlan,
        id: 'no-project-id',
        projectId: null,
        title: input.title,
      } as Plan;
      mockPlanCreationService.createPlanFromInput.mockResolvedValue(created);

      const result = await resolver.createPlan(input);

      expect(mockPlanCreationService.createPlanFromInput).toHaveBeenCalledWith(
        input,
      );
      expect(result?.projectId).toBeNull();
    });
  });

  describe('runConfigJson', () => {
    test('serializes plan run_config column', () => {
      const json = resolver.runConfigJson(mockPlan);
      const parsed = JSON.parse(json) as {
        target: { mode: string };
        version: number;
      };
      expect(parsed.version).toBe(1);
      expect(parsed.target.mode).toBe('plan');
    });

    test('normalizes legacy version-only shell from DB', () => {
      const planShellOnly = {
        ...mockPlan,
        runConfig: { version: 1 },
      } as Plan;
      const json = resolver.runConfigJson(planShellOnly);
      const parsed = JSON.parse(json) as {
        ralph: { executionBackend: string };
        version: number;
      };
      expect(parsed.version).toBe(1);
      expect(parsed.ralph.executionBackend).toBeDefined();
    });
  });

  describe('hasCustomRunConfig', () => {
    test('returns false for default run_config', () => {
      expect(resolver.hasCustomRunConfig(mockPlan)).toBe(false);
    });

    test('returns false for legacy version-only shell from DB', () => {
      const planShellOnly = {
        ...mockPlan,
        runConfig: { version: 1 },
      } as Plan;
      expect(resolver.hasCustomRunConfig(planShellOnly)).toBe(false);
    });

    test('returns true when run_config differs from defaults', () => {
      const planWithCustomConfig = {
        ...mockPlan,
        runConfig: {
          ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }),
          ralph: {
            ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }).ralph,
            iterations: 42,
          },
        },
      } as Plan;
      expect(resolver.hasCustomRunConfig(planWithCustomConfig)).toBe(true);
    });
  });

  describe('jobRunHooksJson', () => {
    test('serializes plan job_run_hooks column', () => {
      const planWithHooks = {
        ...mockPlan,
        jobRunHooks: {
          hooks: [
            {
              kind: 'prompt_profile',
              phase: 'before_run',
              prompt: '/agents/ralph',
              promptDelivery: 'named',
            },
          ],
        },
      } as Plan;
      const json = resolver.jobRunHooksJson(planWithHooks);
      const parsed = JSON.parse(json) as { hooks: { phase: string }[] };
      expect(parsed.hooks[0]?.phase).toBe('beforeAll');
    });
  });

  describe('updatePlan', () => {
    test('persists runConfigJson on update', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      const updatedConfig = {
        ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }),
        ralph: {
          ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }).ralph,
          iterations: 42,
        },
      };
      const configJson = JSON.stringify(updatedConfig);
      vi.mocked(repo.save).mockImplementation(async (entity) => entity as Plan);

      await resolver.updatePlan({
        id: mockPlan.id,
        runConfigJson: configJson,
      } as UpdatePlanInput);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          runConfig: expect.objectContaining({
            ralph: expect.objectContaining({ iterations: 42 }),
          }),
        }),
      );
    });

    test('resets runConfigJson to defaults when null', async () => {
      const repo = plansService.getRepository();
      const planWithCustomConfig = {
        ...mockPlan,
        runConfig: {
          ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }),
          ralph: {
            ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }).ralph,
            iterations: 99,
          },
        },
      } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(planWithCustomConfig);
      vi.mocked(repo.save).mockImplementation(async (entity) => entity as Plan);

      await resolver.updatePlan({
        id: mockPlan.id,
        runConfigJson: null,
      } as UpdatePlanInput);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          runConfig: expect.objectContaining({
            ralph: expect.objectContaining({
              iterations: 10,
            }),
          }),
        }),
      );
    });

    test('persists jobRunHooksJson on update', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      const hooksJson = JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'after_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      });
      vi.mocked(repo.save).mockImplementation(async (entity) => entity as Plan);

      await resolver.updatePlan({
        id: mockPlan.id,
        jobRunHooksJson: hooksJson,
      } as UpdatePlanInput);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          jobRunHooks: expect.objectContaining({
            hooks: expect.arrayContaining([
              expect.objectContaining({ phase: 'afterAll' }),
            ]),
          }),
        }),
      );
    });

    test('can set projectId to null', async () => {
      const repo = plansService.getRepository();
      const planWithProject = {
        ...mockPlan,
        id: 'plan-with-project',
        projectId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(planWithProject);
      const saved = { ...planWithProject, projectId: null };
      vi.mocked(repo.save).mockResolvedValue(saved as Plan);

      const input: UpdatePlanInput = {
        assignee: null,
        author: null,
        category: null,
        description: null,
        id: planWithProject.id,
        project: null,
        projectId: null,
        status: null,
        summary: null,
        title: null,
      };

      const result = await resolver.updatePlan(input);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: planWithProject.id,
          projectId: null,
        }),
      );
      expect(result?.projectId).toBeNull();
    });

    describe('IN_PROGRESS transition (openthrottle-ralph parity)', () => {
      /**
       * @description Matches GraphQL clients that send only `id` + changed fields; `undefined`
       * means omitted so the resolver does not treat null clears as updates.
       */
      test('transitions PENDING to IN_PROGRESS and persists', async () => {
        const repo = plansService.getRepository();
        const pending = { ...mockPlan, status: 'PENDING' } as Plan;
        const saved = { ...pending, status: 'IN_PROGRESS' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(pending);
        vi.mocked(repo.save).mockClear();
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        const result = await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledTimes(1);
        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockPlan.id,
            status: 'IN_PROGRESS',
          }),
        );
        expect(result?.status).toBe('IN_PROGRESS');
      });

      test('accepts lowercase in_progress for PENDING → IN_PROGRESS', async () => {
        const repo = plansService.getRepository();
        const pending = { ...mockPlan, status: 'pending' } as Plan;
        const saved = { ...pending, status: 'IN_PROGRESS' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(pending);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input = {
          id: mockPlan.id,
          status: 'in_progress',
        } as UpdatePlanInput;

        await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'IN_PROGRESS' }),
        );
      });

      test('transitions QUEUED to IN_PROGRESS and persists', async () => {
        const repo = plansService.getRepository();
        const queued = { ...mockPlan, status: 'QUEUED' } as Plan;
        const saved = { ...queued, status: 'IN_PROGRESS' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(queued);
        vi.mocked(repo.save).mockClear();
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        const result = await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledTimes(1);
        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockPlan.id,
            status: 'IN_PROGRESS',
          }),
        );
        expect(result?.status).toBe('IN_PROGRESS');
      });

      test('accepts lowercase queued for QUEUED → IN_PROGRESS', async () => {
        const repo = plansService.getRepository();
        const queued = { ...mockPlan, status: 'queued' } as Plan;
        const saved = { ...queued, status: 'IN_PROGRESS' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(queued);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'IN_PROGRESS' }),
        );
      });

      test('throws BadRequestException when COMPLETED plan requests IN_PROGRESS with no other changes', async () => {
        const repo = plansService.getRepository();
        const completed = { ...mockPlan, status: 'COMPLETED' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockClear();

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        await expect(resolver.updatePlan(input)).rejects.toMatchObject({
          message: IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE,
          response: expect.objectContaining({
            message: IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE,
          }),
        });
        expect(repo.save).not.toHaveBeenCalled();
      });

      test('throws BadRequestException when BLOCKED plan requests IN_PROGRESS with no other changes', async () => {
        const repo = plansService.getRepository();
        const blocked = { ...mockPlan, status: 'BLOCKED' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(blocked);
        vi.mocked(repo.save).mockClear();

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        await expect(resolver.updatePlan(input)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(repo.save).not.toHaveBeenCalled();
      });

      test('returns unchanged plan without save when already IN_PROGRESS and input requests IN_PROGRESS', async () => {
        const repo = plansService.getRepository();
        const inProgress = { ...mockPlan, status: 'IN_PROGRESS' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(inProgress);
        vi.mocked(repo.save).mockClear();

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        } as UpdatePlanInput;

        const result = await resolver.updatePlan(input);

        expect(result?.status).toBe('IN_PROGRESS');
        expect(repo.save).not.toHaveBeenCalled();
      });

      test('persists other fields when invalid IN_PROGRESS is requested but another field changes', async () => {
        const repo = plansService.getRepository();
        const completed = {
          ...mockPlan,
          status: 'COMPLETED',
          title: 'Old',
        } as Plan;
        const saved = { ...completed, title: 'New title' } as Plan;
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
          title: 'New title',
        } as UpdatePlanInput;

        const result = await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'COMPLETED',
            title: 'New title',
          }),
        );
        expect(result?.status).toBe('COMPLETED');
        expect(result?.title).toBe('New title');
      });
    });
  });
});
