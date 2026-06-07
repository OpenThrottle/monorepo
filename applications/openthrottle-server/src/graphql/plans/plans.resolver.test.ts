import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createMock } from '@golevelup/ts-vitest';
import {
  getDefaultPlanRunConfigStorage,
  PlansService,
  PlanRunsService,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Plan } from '@openthrottle/nestjs-repositories';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import {
  afterEach,
  describe,
  expect,
  beforeAll,
  test,
  vi,
  beforeEach,
} from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { QueuesService } from '../queues/queues.service';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { PlanCreationService } from '../../services/plan-creation/plan-creation.service';
import {
  CreatePlanInput,
  EnqueuePlanRunInput,
  ListPlansByStatusInput,
  PlanRalphWorkflowModeGraphQL,
  SetPlanStatusInput,
  UpdatePlanInput,
} from './plan.input';
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

  const taskRepo = {
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

  const mockEnqueuePlanRalphOrchestrator = vi
    .fn()
    .mockResolvedValue({ jobId: 'job-orch-1' });

  const mockQueuesService = createMock<QueuesService>({
    enqueuePlanRalphOrchestrator: mockEnqueuePlanRalphOrchestrator,
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlansResolver,
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
        { provide: PlanRunsService, useValue: mockPlanRunsService },
        { provide: PlansService, useValue: mockPlansService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: QueuesService, useValue: mockQueuesService },
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

  describe('enqueuePlanRun (legacy spawn default)', () => {
    let prevDefaultRunKind: string | undefined;

    beforeEach(() => {
      // These assertions cover the spawn path; force spawn so the orchestrator-by-default flip
      // (resolveDefaultPlanRunKind) does not reroute them. Stage (a) rollback flag.
      prevDefaultRunKind = process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = 'spawn';
      taskRepo.find.mockReset();
      taskRepo.find.mockResolvedValue([]);
      taskRepo.update.mockClear();
      mockEmitTaskStatusChanged.mockClear();
    });

    afterEach(() => {
      if (prevDefaultRunKind === undefined) {
        delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      } else {
        process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = prevDefaultRunKind;
      }
    });

    test('returns job id, plan id, and queue position when plan exists', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockRecordQueuedRun.mockClear();

      const result = await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(result).not.toBeNull();
      expect(result.executionBackend).toBe('cursor');
      expect(result.jobId).toBe('job-1');
      expect(result.planId).toBe(mockPlan.id);
      expect(result.queuePosition).toBe(1);
      expect(result.queueTotal).toBe(1);
      expect(mockRecordQueuedRun).toHaveBeenCalledWith(
        expect.objectContaining({
          bullmqJobId: 'job-1',
          executionBackend: 'cursor',
          planId: mockPlan.id,
          queueName: PLANS_QUEUE_NAME,
          runConfigSnapshot: expect.objectContaining({
            ralph: { executionBackend: 'cursor' },
            target: { mode: 'plan', taskId: '' },
          }),
          runKind: 'spawn',
        }),
      );
    });

    test('throws NotFoundException when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const input: EnqueuePlanRunInput = {
        planId: 'non-existent-id',
        priority: null,
        workingDirectory: null,
      };
      await expect(resolver.enqueuePlanRun(input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    test('sets non-completed tasks to QUEUED (PENDING, IN_PROGRESS, BLOCKED, BACKLOG, SKIPPED, CANCELED)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.find.mockResolvedValueOnce([{ id: 'task-a' }, { id: 'task-b' }]);
      taskRepo.update.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(taskRepo.find).toHaveBeenCalledOnce();
      expect(taskRepo.update).toHaveBeenCalledTimes(1);
      const [criteria, set] = taskRepo.update.mock.calls[0] as [
        { planId: string; status: { value: readonly string[] } },
        { status: string },
      ];
      expect(criteria.planId).toBe(mockPlan.id);
      expect(set).toEqual({ status: 'QUEUED' });
      const statusesToReset = criteria.status.value;
      expect(statusesToReset).toEqual([
        'PENDING',
        'IN_PROGRESS',
        'BLOCKED',
        'BACKLOG',
        'SKIPPED',
        'CANCELED',
      ]);
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledTimes(2);
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'QUEUED',
        taskId: 'task-a',
      });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'QUEUED',
        taskId: 'task-b',
      });
    });

    test('does not update COMPLETED tasks to QUEUED', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.find.mockResolvedValueOnce([]);
      taskRepo.find.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(taskRepo.find).toHaveBeenCalledOnce();
      const findArgs = taskRepo.find.mock.calls[0]?.[0] as {
        where: { planId: string; status: { value: readonly string[] } };
      };
      expect(findArgs.where.status.value).not.toContain('COMPLETED');
    });

    test('re-queue calls task update again (idempotent behavior)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.find.mockResolvedValue([{ id: 'task-1' }]);
      taskRepo.update.mockClear();
      taskRepo.find.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });
      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(taskRepo.find).toHaveBeenCalledTimes(2);
      expect(taskRepo.update).toHaveBeenCalledTimes(2);
      expect(taskRepo.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ planId: mockPlan.id }),
        { status: 'QUEUED' },
      );
      expect(taskRepo.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ planId: mockPlan.id }),
        { status: 'QUEUED' },
      );
    });

    test('passes priority to queue.add when priority is provided', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: 1,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { executionBackend: 'cursor', planId: mockPlan.id },
        { priority: 1 },
      );
    });

    test('uses default priority (10) when priority is null', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { executionBackend: 'cursor', planId: mockPlan.id },
        { priority: 10 },
      );
    });

    test('omits ralph from queue job data when ralph input is not provided', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      const jobData = mockAdd.mock.calls[0]?.[1];
      expect(jobData).toEqual({
        executionBackend: 'cursor',
        planId: mockPlan.id,
      });
      expect(jobData).not.toHaveProperty('ralph');
    });

    test('accepts batch priority (100)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: 100,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { executionBackend: 'cursor', planId: mockPlan.id },
        { priority: 100 },
      );
    });

    test('passes ralph tuning into queue job data when provided', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        ralph: {
          backend: 'cursor',
          iterationTimeoutSeconds: 120,
          iterations: 5,
          model: null,
          project: 'applications/openthrottle-server',
          prompt: null,
          promptFile: null,
          ralphDebugCli: 'verbose',
          skipWorktreeSetup: null,
          worktree: 'target-one',
          worktreeBase: null,
        },
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        expect.objectContaining({
          executionBackend: 'cursor',
          planId: mockPlan.id,
          ralph: expect.objectContaining({
            backend: 'cursor',
            debug: 'verbose',
            iterationTimeoutSeconds: 120,
            iterations: 5,
            project: 'applications/openthrottle-server',
            worktree: 'target-one',
          }),
        }),
        { priority: 10 },
      );
    });

    /**
     * @description Enqueue with a real directory outside the OT tree so `buildRunPlanJobData` validation
     * passes; BullMQ payload must carry `workingDirectory` for the processor spawn cwd (regression:
     * nested CLI must still use worker POSTGRES / canonical OpenThrottle URL).
     */
    test('includes external workingDirectory in queue job data (enqueue → processor contract)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      const externalDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'ot-external-wd-'),
      );
      try {
        await resolver.enqueuePlanRun({
          planId: mockPlan.id,
          priority: null,
          workingDirectory: externalDir,
        });

        expect(mockAdd).toHaveBeenCalledWith(
          'run-plan',
          {
            executionBackend: 'cursor',
            planId: mockPlan.id,
            workingDirectory: externalDir,
          },
          { priority: 10 },
        );
      } finally {
        fs.rmSync(externalDir, { force: true, recursive: true });
      }
    });

    test('throws BadRequestException when ralph tuning is invalid', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      await expect(
        resolver.enqueuePlanRun({
          planId: mockPlan.id,
          priority: null,
          ralph: {
            backend: 'not-a-real-backend',
            iterationTimeoutSeconds: null,
            iterations: null,
            model: null,
            project: null,
            prompt: null,
            promptFile: null,
            ralphDebugCli: null,
          },
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /**
     * @description After kill/cancel, plan is PENDING and queue job is gone; a new Run plan must
     * enqueue successfully (no stuck state blocking a follow-up run).
     */
    test('enqueuePlanRun succeeds after cancelPlanRun left plan PENDING (regression: new run after kill)', async () => {
      mockPlanRunCancellationAbort.mockReturnValue(false);
      const remove = vi.fn().mockResolvedValue(undefined);
      mockGetJobs.mockResolvedValueOnce([
        {
          data: { planId: mockPlan.id },
          getState: vi.fn(),
          id: 'job-99',
          name: 'run-plan',
          remove,
        },
      ]);
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne)
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });

      await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(remove).toHaveBeenCalledOnce();

      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockPlan,
        status: 'PENDING',
      });
      mockAdd.mockClear();
      vi.mocked(repo.update).mockClear();

      const enqueueResult = await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(enqueueResult.planId).toBe(mockPlan.id);
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { status: 'QUEUED' },
      );
    });
  });

  describe('enqueuePlanRun (orchestrator by default)', () => {
    let prevDefaultRunKind: string | undefined;

    beforeEach(() => {
      prevDefaultRunKind = process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      taskRepo.find.mockReset();
      taskRepo.find.mockResolvedValue([]);
      mockAdd.mockClear();
      mockEnqueuePlanRalphOrchestrator.mockClear();
      mockEnqueuePlanRalphOrchestrator.mockResolvedValue({
        jobId: 'job-orch-1',
      });
    });

    afterEach(() => {
      if (prevDefaultRunKind === undefined) {
        delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      } else {
        process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = prevDefaultRunKind;
      }
    });

    test('routes to the orchestrator path (no spawn) when default run kind is orchestrator', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.enqueuePlanRun({
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        workingDirectory: null,
      });

      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledTimes(1);
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({
            planId: mockPlan.id,
            runKind: 'orchestrator',
          }),
        }),
      );
      expect(mockAdd).not.toHaveBeenCalled();
      expect(result.jobId).toBe('job-orch-1');
    });

    test('OPENTHROTTLE_DEFAULT_RUN_KIND=spawn reverts to the spawn path (rollback flag)', async () => {
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = 'spawn';
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      await resolver.enqueuePlanRun({
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        workingDirectory: null,
      });

      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(mockEnqueuePlanRalphOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe('workflowPlanRun', () => {
    let prevDefaultRunKind: string | undefined;

    beforeEach(() => {
      prevDefaultRunKind = process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = 'spawn';
    });

    afterEach(() => {
      if (prevDefaultRunKind === undefined) {
        delete process.env.OPENTHROTTLE_DEFAULT_RUN_KIND;
      } else {
        process.env.OPENTHROTTLE_DEFAULT_RUN_KIND = prevDefaultRunKind;
      }
    });

    test('throws NotFoundException when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(
        resolver.workflowPlanRun({
          planId: 'non-existent-id',
          priority: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('delegates to enqueuePlanRun with identical result', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();
      mockRecordQueuedRun.mockClear();

      const input = {
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        workingDirectory: null,
      };

      const viaCanonical = await resolver.enqueuePlanRun(input);
      mockAdd.mockClear();
      mockRecordQueuedRun.mockClear();

      const viaAlias = await resolver.workflowPlanRun(input);

      expect(viaAlias).toEqual(viaCanonical);
      expect(mockAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueuePlanRalphOrchestrator', () => {
    test('throws NotFoundException when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(
        resolver.enqueuePlanRalphOrchestrator({
          idempotencyKey: null,
          mode: null,
          planId: 'non-existent-id',
          priority: null,
          ralph: null,
          taskId: null,
          workingDirectory: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('delegates to QueuesService with orchestrator job data', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockEnqueuePlanRalphOrchestrator.mockClear();
      mockAdd.mockClear();
      mockRecordQueuedRun.mockClear();

      const result = await resolver.enqueuePlanRalphOrchestrator({
        idempotencyKey: null,
        mode: null,
        planId: mockPlan.id,
        priority: null,
        ralph: null,
        taskId: null,
        workingDirectory: null,
      });

      expect(result.executionBackend).toBe('cursor');
      expect(result.jobId).toBe('job-orch-1');
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith({
        idempotencyKey: undefined,
        jobData: {
          executionBackend: 'cursor',
          planId: mockPlan.id,
          runKind: 'orchestrator',
        },
        priority: 10,
      });
      expect(mockRecordQueuedRun).toHaveBeenCalledWith({
        bullmqJobId: 'job-orch-1',
        executionBackend: 'cursor',
        planId: mockPlan.id,
        queueName: PLANS_QUEUE_NAME,
        runConfigSnapshot: expect.objectContaining({
          ralph: { executionBackend: 'cursor' },
          target: { mode: 'plan', taskId: '' },
          version: 1,
          workspace: { workingDirectory: '' },
        }),
        runKind: 'orchestrator',
      });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('task mode validates task belongs to plan', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.findOne.mockResolvedValueOnce({
        id: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
        planId: mockPlan.id,
      } as never);
      mockEnqueuePlanRalphOrchestrator.mockClear();

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
      expect(mockEnqueuePlanRalphOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          jobData: expect.objectContaining({
            mode: 'task',
            runKind: 'orchestrator',
            taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
          }),
        }),
      );
    });

    test('throws when task not found for task mode', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
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

  describe('cancelPlanRun', () => {
    beforeEach(() => {
      mockPlanRunCancellationAbort.mockReturnValue(false);
      taskRepo.find.mockResolvedValue([]);
      mockEmitTaskStatusChanged.mockClear();
    });

    test('throws NotFoundException when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(
        resolver.cancelPlanRun({ planId: 'missing-id' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('returns noMatchingJob when queue has no matching jobs', async () => {
      mockGetJobs.mockResolvedValueOnce([]);
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(result.noMatchingJob).toBe(true);
      expect(result.removedJobIds).toEqual([]);
      expect(result.activeJobIdsCouldNotCancel).toEqual([]);
      expect(result.planStatusAfter).toBeNull();
      expect(result.signaledActiveRunToStop).toBe(false);
    });

    test('removes waiting run-plan job and sets plan and tasks to PENDING', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      mockGetJobs.mockResolvedValueOnce([
        {
          data: { planId: mockPlan.id },
          getState: vi.fn(),
          id: 'job-99',
          name: 'run-plan',
          remove,
        },
      ]);
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne)
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      taskRepo.find.mockResolvedValueOnce([{ id: 'task-queued' }]);
      taskRepo.update.mockClear();

      const result = await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(remove).toHaveBeenCalledOnce();
      expect(result.removedJobIds).toEqual(['job-99']);
      expect(result.noMatchingJob).toBe(false);
      expect(result.planStatusAfter).toBe('PENDING');
      expect(result.signaledActiveRunToStop).toBe(false);
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { status: 'PENDING' },
      );
      expect(taskRepo.update).toHaveBeenCalledOnce();
      const [criteria, set] = taskRepo.update.mock.calls[0] as [
        { planId: string; status: unknown },
        { status: string },
      ];
      expect(criteria.planId).toBe(mockPlan.id);
      expect(set).toEqual({ status: 'PENDING' });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'PENDING',
        taskId: 'task-queued',
      });
    });

    test('reports active job ids when remove fails for locked job', async () => {
      const remove = vi.fn().mockRejectedValue(new Error('locked'));
      const getState = vi.fn().mockResolvedValue('active');
      mockGetJobs.mockResolvedValueOnce([
        {
          data: { planId: mockPlan.id },
          getState,
          id: 'job-a',
          name: 'run-plan',
          remove,
        },
      ]);
      const repo = plansService.getRepository();
      vi.mocked(repo.update).mockClear();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(result.removedJobIds).toEqual([]);
      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.noMatchingJob).toBe(false);
      expect(result.planStatusAfter).toBeNull();
      expect(result.signaledActiveRunToStop).toBe(false);
      expect(mockPlanRunCancellationAbort).toHaveBeenCalledWith(mockPlan.id);
      expect(repo.update).not.toHaveBeenCalled();
    });

    test('when active job cannot be removed but abort succeeds, sets plan and tasks to PENDING', async () => {
      mockPlanRunCancellationAbort.mockReturnValue(true);
      const remove = vi.fn().mockRejectedValue(new Error('locked'));
      const getState = vi.fn().mockResolvedValue('active');
      mockGetJobs.mockResolvedValueOnce([
        {
          data: { planId: mockPlan.id },
          getState,
          id: 'job-a',
          name: 'run-plan',
          remove,
        },
      ]);
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne)
        .mockResolvedValueOnce(mockPlan)
        .mockResolvedValueOnce({ ...mockPlan, status: 'PENDING' });
      taskRepo.find.mockResolvedValueOnce([{ id: 'task-queued' }]);
      taskRepo.update.mockClear();
      vi.mocked(repo.update).mockClear();

      const result = await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(result.removedJobIds).toEqual([]);
      expect(result.activeJobIdsCouldNotCancel).toEqual(['job-a']);
      expect(result.signaledActiveRunToStop).toBe(true);
      expect(result.planStatusAfter).toBe('PENDING');
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { status: 'PENDING' },
      );
      expect(taskRepo.update).toHaveBeenCalledOnce();
      const [, set] = taskRepo.update.mock.calls[0] as [
        { planId: string; status: unknown },
        { status: string },
      ];
      expect(set).toEqual({ status: 'PENDING' });
      expect(mockEmitTaskStatusChanged).toHaveBeenCalledWith({
        planId: mockPlan.id,
        status: 'PENDING',
        taskId: 'task-queued',
      });
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

  describe('setPlanStatus', () => {
    test('returns updated plan when plan exists', async () => {
      const repo = plansService.getRepository();
      const planToUpdate = { ...mockPlan, status: 'PENDING' } as Plan;
      const saved = { ...planToUpdate, status: 'COMPLETED' } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(planToUpdate);
      vi.mocked(repo.save).mockResolvedValue(saved);

      const input: SetPlanStatusInput = {
        planId: mockPlan.id,
        status: 'COMPLETED',
      };

      const result = await resolver.setPlanStatus(input);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.status).toBe('COMPLETED');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPlan.id,
          status: 'COMPLETED',
        }),
      );
    });

    test('normalizes status to uppercase', async () => {
      const repo = plansService.getRepository();
      const planToUpdate = { ...mockPlan, status: 'pending' } as Plan;
      const saved = { ...planToUpdate, status: 'IN_PROGRESS' } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(planToUpdate);
      vi.mocked(repo.save).mockResolvedValue(saved);

      const result = await resolver.setPlanStatus({
        planId: mockPlan.id,
        status: 'in_progress',
      });

      expect(result?.status).toBe('IN_PROGRESS');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
    });

    test('transitions QUEUED to IN_PROGRESS and persists', async () => {
      const repo = plansService.getRepository();
      const queued = { ...mockPlan, status: 'QUEUED' } as Plan;
      const saved = { ...queued, status: 'IN_PROGRESS' } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(queued);
      vi.mocked(repo.save).mockResolvedValue(saved);

      const result = await resolver.setPlanStatus({
        planId: mockPlan.id,
        status: 'IN_PROGRESS',
      });

      expect(result?.status).toBe('IN_PROGRESS');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        }),
      );
    });

    test('throws BadRequestException when COMPLETED plan requests IN_PROGRESS', async () => {
      const repo = plansService.getRepository();
      const completed = { ...mockPlan, status: 'COMPLETED' } as Plan;
      vi.mocked(repo.findOne).mockResolvedValue(completed);
      vi.mocked(repo.save).mockClear();

      await expect(
        resolver.setPlanStatus({
          planId: mockPlan.id,
          status: 'IN_PROGRESS',
        }),
      ).rejects.toMatchObject({
        message: IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE,
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    test('returns null when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);
      vi.mocked(repo.save).mockClear();

      const result = await resolver.setPlanStatus({
        planId: 'non-existent-id',
        status: 'COMPLETED',
      });

      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
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

    describe('IN_PROGRESS transition (cortex-ralph parity)', () => {
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
