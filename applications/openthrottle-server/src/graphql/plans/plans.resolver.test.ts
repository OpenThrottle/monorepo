import { createMock } from '@golevelup/ts-vitest';
import {
  AgentCliPreferencesService,
  getDefaultPlanRunConfigStorage,
  PlansService,
  PlanRunsService,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { Plan, Task } from '@openthrottle/nestjs-repositories';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import type { SelectQueryBuilder } from 'typeorm';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { PlanCancelChannelService } from '../../queues/plans/plan-cancel-channel.service';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { PlanCreationService } from '../../services/plan-creation/plan-creation.service';
import { PlanRunWorktreeCheckoutService } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.service';
import { PlanEnqueueService } from './plan-enqueue.service';
import { PlanStatusService } from './plan-status.service';
import {
  CreatePlanInput,
  ListPlansByStatusInput,
  PlanRalphWorkflowModeGraphQL,
  UpdatePlanInput,
} from './plan.input';
import { PlansLoaders } from './plans-loaders';
import { PlanRulesEvaluationService } from '../../queues/plan-rules/plan-rules-evaluation.service';
import { PLAN_RULES_TRIGGER_KINDS } from '../../queues/plan-rules/plan-rules.types';
import { TaggingEnqueueService } from '../../queues/tagging/tagging-enqueue.service';
import { PERMISSIONS, PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { PlansResolver } from './plans.resolver';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service';

vi.mock('@openthrottle/node-client', () => ({
  getPostgresConfig: vi.fn(),
  searchPlansBySemanticQuery: vi.fn(),
}));

const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE =
  'Cannot transition to IN_PROGRESS: only PENDING, QUEUED, or already IN_PROGRESS plans may enter this state.';

describe('PlansResolver', () => {
  let resolver: PlansResolver;
  let plansService: PlansService;

  const mockPlan: Plan = createMock<Plan>({
    assignee: null,
    author: 'visormatt',
    category: 'openthrottle-server',
    createdAt: new Date('2026-02-01T19:57:37.738Z'),
    description: 'A test plan',
    id: '80864bba-630a-451d-bfd2-4b25ec202381',
    jobRunHooks: { hooks: [] },
    planEmbeddings: [],
    planOutputChunks: [],
    project: null,
    projectId: null,
    projectRelation: null,
    runConfig: getDefaultPlanRunConfigStorage({
      planId: '80864bba-630a-451d-bfd2-4b25ec202381',
    }),
    status: 'pending',
    summary: null,
    tasks: [],
    title: 'Test plan',
    updatedAt: new Date('2026-02-01T19:59:19.440Z'),
  });

  function createQueryBuilderMock(
    getManyAndCountResult: [Plan[], number] = [[], 0],
  ) {
    const andWhere = vi.fn().mockReturnThis();
    const orderBy = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const take = vi.fn().mockReturnThis();
    const getManyAndCount = vi.fn().mockResolvedValue(getManyAndCountResult);
    const chain = createMock<SelectQueryBuilder<Plan>>({
      andWhere,
      getManyAndCount,
      orderBy,
      select,
      skip,
      take,
    });
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
            save: <T>(entity: T) => Promise<T>;
          }) => unknown,
        ) =>
          cb({
            getRepository: (entity: unknown) =>
              entity === Task ? taskRepo : repo,
            // Delegate to repo.save so existing `expect(repo.save)` assertions still hold.
            save: <T>(entity: T): Promise<T> => repo.save(entity),
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
  const mockPlansLoaders = createMock<PlansLoaders>({
    projectLoader: { load: mockProjectLoad },
    taskCountByPlanIdLoader: { load: mockTaskCountLoad },
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
  const mockFindById = vi.fn().mockResolvedValue(null);
  const mockRecordHeartbeatById = vi.fn().mockResolvedValue(1);
  const mockRegisterCliRun = vi.fn().mockResolvedValue({});
  const mockSettleCliRun = vi.fn().mockResolvedValue({});
  const mockPlanRunsService = createMock<PlanRunsService>({
    findById: mockFindById,
    findRecentByPlanId: mockFindRecentByPlanId,
    recordHeartbeatById: mockRecordHeartbeatById,
    recordQueuedRun: mockRecordQueuedRun,
    registerCliRun: mockRegisterCliRun,
    settleCliRun: mockSettleCliRun,
  });

  const mockAgentIsEnabled = vi.fn().mockResolvedValue(true);
  const mockAgentIsModelEnabled = vi.fn().mockResolvedValue(true);
  const mockAgentPreferences = createMock<AgentCliPreferencesService>({
    isEnabled: mockAgentIsEnabled,
    isModelEnabled: mockAgentIsModelEnabled,
  });

  const mockRegisterWorktreeCheckout = vi.fn().mockResolvedValue(null);
  const mockPlanRunWorktreeCheckoutService =
    createMock<PlanRunWorktreeCheckoutService>({
      register: mockRegisterWorktreeCheckout,
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

  const mockEnqueueEvaluation = vi.fn().mockResolvedValue(undefined);
  const mockPlanRulesEvaluationService = createMock<PlanRulesEvaluationService>(
    {
      enqueueEvaluation: mockEnqueueEvaluation,
    },
  );

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlansResolver,
        {
          provide: AgentCliPreferencesService,
          useValue: mockAgentPreferences,
        },
        { provide: PlansLoaders, useValue: mockPlansLoaders },
        {
          provide: PlanRulesEvaluationService,
          useValue: mockPlanRulesEvaluationService,
        },
        {
          provide: TaggingEnqueueService,
          useValue: createMock<TaggingEnqueueService>(),
        },
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
        {
          provide: PlanCancelChannelService,
          useValue: createMock<PlanCancelChannelService>({
            publishCancel: vi.fn().mockResolvedValue(undefined),
          }),
        },
        { provide: PlanEnqueueService, useValue: mockPlanEnqueueService },
        // Real PlanStatusService wired to the existing mocks: updatePlan's merge + transition
        // policy orchestration is exercised end-to-end here; the focused setStatus/cancelRun/policy
        // unit coverage lives in plan-status.service.test.ts.
        PlanStatusService,
        { provide: PlanRunsService, useValue: mockPlanRunsService },
        {
          provide: PlanRunWorktreeCheckoutService,
          useValue: mockPlanRunWorktreeCheckoutService,
        },
        { provide: PlansService, useValue: mockPlansService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: TasksService, useValue: mockTasksService },
        {
          provide: WorkLedgerCaptureService,
          useValue: createMock<WorkLedgerCaptureService>(),
        },
        {
          provide: getQueueToken(PLANS_QUEUE_NAME),
          useValue: mockPlansQueue,
        },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  describe('resolvePlanRef', () => {
    function createResolvePlanRefQbMock(rows: Plan[]) {
      const getMany = vi.fn().mockResolvedValue(rows);
      const orderBy = vi.fn().mockReturnThis();
      const select = vi.fn().mockReturnThis();
      const take = vi.fn().mockReturnThis();
      const where = vi.fn().mockReturnThis();
      const chain = createMock<SelectQueryBuilder<Plan>>({
        getMany,
        orderBy,
        select,
        take,
        where,
      });
      return { chain, getMany, orderBy, select, take, where };
    }

    test('returns [] and never queries when the prefix is too short', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockClear();

      const result = await resolver.resolvePlanRef('f5e4');

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    test('returns [] and never queries when the prefix is non-hex', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockClear();

      const result = await resolver.resolvePlanRef('zzzzzzzz');

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    test('resolves a unique short prefix to a single PlanRefObject', async () => {
      const repo = plansService.getRepository();
      const qb = createResolvePlanRefQbMock([mockPlan]);
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qb.chain);

      const result = await resolver.resolvePlanRef('80864bba');

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockPlan.id);
      expect(result[0]?.title).toBe(mockPlan.title);
      expect(result[0]?.status).toBe(mockPlan.status);
      // LIKE pattern is the normalized prefix + '%', passed as a bound param.
      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        pattern: '80864bba%',
      });
      // Ambiguous prefixes are capped, so a bounded take is always applied.
      expect(qb.take).toHaveBeenCalledWith(6);
    });

    test('lists multiple matches for an ambiguous prefix', async () => {
      const repo = plansService.getRepository();
      const other: Plan = createMock<Plan>({
        id: '80864bba-0000-0000-0000-000000000000',
        status: 'completed',
        title: 'Second match',
      });
      const qb = createResolvePlanRefQbMock([mockPlan, other]);
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qb.chain);

      const result = await resolver.resolvePlanRef('80864b');

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([mockPlan.id, other.id]);
    });

    test('returns [] when the prefix matches nothing', async () => {
      const repo = plansService.getRepository();
      const qb = createResolvePlanRefQbMock([]);
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qb.chain);

      const result = await resolver.resolvePlanRef('deadbeef');

      expect(result).toEqual([]);
    });

    test('strips hyphens so a fragment spanning a UUID boundary still matches', async () => {
      const repo = plansService.getRepository();
      const qb = createResolvePlanRefQbMock([mockPlan]);
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qb.chain);

      await resolver.resolvePlanRef('80864bba-630a');

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        pattern: '80864bba630a%',
      });
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
      const planWithProjectId: Plan = { ...mockPlan, projectId: 'proj-1' };

      const result = await resolver.projectRelation(planWithProjectId);

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

    test('beforeHooks resolves the plan-level before group via getPlanHooks', async () => {
      vi.mocked(mockTasksService.getPlanHooks).mockResolvedValueOnce({
        after: [],
        before: [],
      });

      const result = await resolver.beforeHooks(mockPlan);

      expect(mockTasksService.getPlanHooks).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toEqual([]);
    });

    test('afterHooks resolves the plan-level after group via getPlanHooks', async () => {
      vi.mocked(mockTasksService.getPlanHooks).mockResolvedValueOnce({
        after: [],
        before: [],
      });

      const result = await resolver.afterHooks(mockPlan);

      expect(mockTasksService.getPlanHooks).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toEqual([]);
    });
  });

  describe('listPlansByStatus', () => {
    test('returns plans and totalCount from query builder (no filters)', async () => {
      const [entities, count] = [[mockPlan], 1];
      const qbMock = createQueryBuilderMock([entities, count]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

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
      const [entities, count] = [[mockPlan], 1];
      const qbMock = createQueryBuilderMock([entities, count]);
      const repo = plansService.getRepository();

      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

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
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

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
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

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

    test('rejects an unknown status with an actionable error and never queries', async () => {
      const qbMock = createQueryBuilderMock([[mockPlan], 1]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        // 'cancelled' (double-L) normalizes to CANCELLED — not a valid enum member.
        statuses: ['IN_PROGRESS', 'cancelled'],
        titleSubstring: null,
      };

      await expect(resolver.listPlansByStatus(input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(resolver.listPlansByStatus(input)).rejects.toThrow(
        /Unknown plan status: "CANCELLED"\. Valid statuses: .*CANCELED/,
      );
      // Validation short-circuits before the DB round-trip.
      expect(qbMock.getManyAndCount).not.toHaveBeenCalled();
    });

    test('treats "all" as no status filter (no validation, no status clause)', async () => {
      const qbMock = createQueryBuilderMock([[mockPlan], 1]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        // 'garbage' would be invalid, but 'all' short-circuits to no filter.
        statuses: ['all', 'garbage'],
        titleSubstring: null,
      };

      const result = await resolver.listPlansByStatus(input);

      expect(result.totalCount).toBe(1);
      expect(qbMock.andWhere).not.toHaveBeenCalled();
    });

    test('accepts the typed statusesEnum arg and builds the IN filter', async () => {
      const qbMock = createQueryBuilderMock([[mockPlan], 1]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(qbMock.chain);

      const input: ListPlansByStatusInput = {
        assignees: null,
        limit: 20,
        offset: 0,
        project: null,
        projectId: null,
        sortBy: 'created',
        sortOrder: 'desc',
        statuses: null,
        statusesEnum: ['COMPLETED'],
        titleSubstring: null,
      };

      await resolver.listPlansByStatus(input);

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'plan.status IN (:status_0)',
        { status_0: 'COMPLETED' },
      );
    });
  });

  describe('setPlanStatus', () => {
    test('rejects an unknown status with an actionable error, before touching the DB', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockClear();

      await expect(
        resolver.setPlanStatus({ planId: mockPlan.id, status: 'draft' }),
      ).rejects.toThrow(/Unknown plan status: "DRAFT"\. Valid statuses: /);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    test('requires either status or statusEnum', async () => {
      await expect(
        resolver.setPlanStatus({ planId: mockPlan.id }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('accepts a valid lowercase status (normalized) and delegates to setStatus', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockClear();
      vi.mocked(repo.findOne).mockResolvedValueOnce(null);

      const result = await resolver.setPlanStatus({
        planId: mockPlan.id,
        status: 'completed',
      });

      expect(result).toBeNull();
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockPlan.id },
      });
    });

    test('accepts the typed statusEnum arg', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockClear();
      vi.mocked(repo.findOne).mockResolvedValueOnce(null);

      const result = await resolver.setPlanStatus({
        planId: mockPlan.id,
        statusEnum: 'COMPLETED',
      });

      expect(result).toBeNull();
      expect(repo.findOne).toHaveBeenCalled();
    });
  });

  describe('status vocabulary queries', () => {
    test('planStatuses returns the full set including QUEUED', () => {
      const result = resolver.planStatuses();
      expect(result).toContain('QUEUED');
      expect(result).toContain('CANCELED');
      expect(result).not.toContain('CANCELLED');
    });

    test('taskStatuses excludes QUEUED (plans-only)', () => {
      const result = resolver.taskStatuses();
      expect(result).not.toContain('QUEUED');
      expect(result).toContain('PENDING');
    });
  });

  describe('searchPlans', () => {
    test('returns empty result when OpenThrottle config is not set', async () => {
      const { getPostgresConfig } = await import('@openthrottle/node-client');

      vi.mocked(getPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/openthrottle',
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
        await import('@openthrottle/node-client');
      vi.mocked(getPostgresConfig).mockReturnValue({
        connectionString: 'postgresql://localhost/openthrottle',
      });
      vi.mocked(searchPlansBySemanticQuery).mockResolvedValue({
        plans: [
          {
            assignee: null,
            author: 'visormatt',
            category: 'openthrottle',
            completedAt: null,
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
        branch: 'feature/test',
        idempotencyKey: 'caller-key',
        jobRunHooksJson: null,
        planId: mockPlan.id,
        priority: 5,
        ralph: null,
        workingDirectory: null,
      });

      expect(mockEnqueueSpawn).toHaveBeenCalledWith({
        actorUserId: null,
        branch: 'feature/test',
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
        branch: 'feature/test',
        planId: mockPlan.id,
        priority: null,
        workingDirectory: null,
      });

      expect(mockEnqueueSpawn).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: null, planId: mockPlan.id }),
      );
    });

    test('captures a user actor as actorUserId', async () => {
      await resolver.enqueuePlanRun(
        {
          branch: 'feature/test',
          planId: mockPlan.id,
          priority: null,
          workingDirectory: null,
        },
        'user-uuid-1',
        'user',
      );

      expect(mockEnqueueSpawn).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: 'user-uuid-1' }),
      );
    });

    test('records no actorUserId for a service-account principal', async () => {
      await resolver.enqueuePlanRun(
        {
          branch: 'feature/test',
          planId: mockPlan.id,
          priority: null,
          workingDirectory: null,
        },
        'ot_sa_abc',
        'service_account',
      );

      expect(mockEnqueueSpawn).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: null }),
      );
    });

    test('rejects an explicitly-chosen model the actor disabled, without enqueueing', async () => {
      mockEnqueueSpawn.mockClear();
      mockAgentIsModelEnabled.mockResolvedValueOnce(false);
      await expect(
        resolver.enqueuePlanRun(
          {
            branch: 'feature/test',
            planId: mockPlan.id,
            priority: null,
            ralph: { backend: 'claude', model: 'opus' },
            workingDirectory: null,
          },
          'user-1',
          'user',
        ),
      ).rejects.toThrow(/opus model is disabled/);
      expect(mockAgentIsModelEnabled).toHaveBeenCalledWith(
        'user-1',
        'claude',
        'opus',
      );
      expect(mockEnqueueSpawn).not.toHaveBeenCalled();
    });
  });

  describe('workflowPlanRun', () => {
    beforeEach(() => {
      mockEnqueueSpawn.mockClear();
      mockEnqueueSpawn.mockResolvedValue(sampleEnqueueOutcome);
    });

    test('delegates to enqueuePlanRun (enqueueSpawn) with an equivalent result', async () => {
      const input = {
        branch: 'feature/test',
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
        branch: 'feature/test',
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
          branch: 'feature/test',
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
      });

      await resolver.enqueuePlanRalphOrchestrator({
        branch: 'feature/test',
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
          branch: 'feature/test',
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

    test('derives isStale: fresh IN_PROGRESS false, stale IN_PROGRESS true, terminal false', async () => {
      const now = Date.now();
      const baseRow = {
        bullmqJobId: null,
        executionBackend: 'claude',
        planId: mockPlan.id,
        queueName: PLANS_QUEUE_NAME,
        runConfigSnapshot: null,
        runKind: 'orchestrator',
        updatedAt: new Date(now),
      };
      mockFindRecentByPlanId.mockResolvedValueOnce([
        // fresh IN_PROGRESS: heartbeat just now -> not stale
        {
          ...baseRow,
          createdAt: new Date(now - 5_000),
          id: 'run-fresh',
          lastHeartbeatAt: new Date(now - 5_000),
          status: 'IN_PROGRESS',
        },
        // stale IN_PROGRESS: heartbeat well past the 120s cutoff -> stale
        {
          ...baseRow,
          createdAt: new Date(now - 600_000),
          id: 'run-stale',
          lastHeartbeatAt: new Date(now - 600_000),
          status: 'IN_PROGRESS',
        },
        // never heartbeated but old created_at -> stale (COALESCE fallback)
        {
          ...baseRow,
          createdAt: new Date(now - 600_000),
          id: 'run-nohb',
          lastHeartbeatAt: null,
          status: 'IN_PROGRESS',
        },
        // terminal row with an ancient heartbeat -> never stale (status conveys it)
        {
          ...baseRow,
          createdAt: new Date(now - 600_000),
          id: 'run-done',
          lastHeartbeatAt: new Date(now - 600_000),
          status: 'COMPLETED',
        },
      ]);

      const result = await resolver.planRunsByPlanId({
        limit: 10,
        planId: mockPlan.id,
      });

      expect(result.map((r) => [r.id, r.isStale])).toEqual([
        ['run-fresh', false],
        ['run-stale', true],
        ['run-nohb', true],
        ['run-done', false],
      ]);
    });
  });

  describe('registerCliPlanRun', () => {
    const cliRunRow = {
      bullmqJobId: null,
      createdAt: new Date('2026-07-22T00:00:00.000Z'),
      executionBackend: 'claude',
      hostname: 'laptop-1',
      id: 'cli-run-1',
      pid: 9999,
      planId: mockPlan.id,
      queueName: PLANS_QUEUE_NAME,
      runConfigSnapshot: null,
      runKind: 'orchestrator',
      status: 'IN_PROGRESS',
      updatedAt: new Date('2026-07-22T00:00:00.000Z'),
      workerId: 'cli-abc',
    };

    test('delegates to registerCliRun and maps the null-job-id row', async () => {
      mockRegisterCliRun.mockResolvedValueOnce(cliRunRow);

      const result = await resolver.registerCliPlanRun({
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 9999,
        planId: mockPlan.id,
        workerId: 'cli-abc',
      });

      expect(mockRegisterCliRun).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: null,
          executionBackend: 'claude',
          hostname: 'laptop-1',
          pid: 9999,
          planId: mockPlan.id,
          workerId: 'cli-abc',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          bullmqJobId: null,
          id: 'cli-run-1',
          runKind: 'orchestrator',
          status: 'IN_PROGRESS',
        }),
      );
    });

    test('forwards a present branch verbatim (no trim/reject)', async () => {
      mockRegisterCliRun.mockResolvedValueOnce(cliRunRow);

      await resolver.registerCliPlanRun({
        branch: '  capture-branch-name  ',
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 9999,
        planId: mockPlan.id,
        workerId: 'cli-abc',
      });

      expect(mockRegisterCliRun).toHaveBeenCalledWith(
        expect.objectContaining({ branch: '  capture-branch-name  ' }),
      );
    });

    test('forwards null when branch is omitted', async () => {
      mockRegisterCliRun.mockResolvedValueOnce(cliRunRow);

      await resolver.registerCliPlanRun({
        executionBackend: 'claude',
        hostname: null,
        pid: null,
        planId: mockPlan.id,
        workerId: null,
      });

      expect(mockRegisterCliRun).toHaveBeenCalledWith(
        expect.objectContaining({ branch: null }),
      );
    });

    test('forwards null when branch is explicitly null', async () => {
      mockRegisterCliRun.mockResolvedValueOnce(cliRunRow);

      await resolver.registerCliPlanRun({
        branch: null,
        executionBackend: 'claude',
        hostname: null,
        pid: null,
        planId: mockPlan.id,
        workerId: null,
      });

      expect(mockRegisterCliRun).toHaveBeenCalledWith(
        expect.objectContaining({ branch: null }),
      );
    });

    test('rejects an invalid executionBackend without touching the service', async () => {
      mockRegisterCliRun.mockClear();
      await expect(
        resolver.registerCliPlanRun({
          executionBackend: 'gpt',
          hostname: null,
          pid: null,
          planId: mockPlan.id,
          workerId: null,
        }),
      ).rejects.toThrow(/Invalid executionBackend/);
      expect(mockRegisterCliRun).not.toHaveBeenCalled();
    });

    test('rejects a backend the actor disabled, without touching the service', async () => {
      mockRegisterCliRun.mockClear();
      mockAgentIsEnabled.mockResolvedValueOnce(false);
      await expect(
        resolver.registerCliPlanRun(
          {
            executionBackend: 'claude',
            hostname: null,
            pid: null,
            planId: mockPlan.id,
            workerId: null,
          },
          'user-1',
          AUTH_PRINCIPAL_KIND_USER,
        ),
      ).rejects.toThrow(/claude agent is disabled/);
      expect(mockAgentIsEnabled).toHaveBeenCalledWith('user-1', 'claude');
      expect(mockRegisterCliRun).not.toHaveBeenCalled();
    });
  });

  describe('settleCliPlanRun', () => {
    test('normalizes status to uppercase, settles by id, and maps the row', async () => {
      mockSettleCliRun.mockResolvedValueOnce({
        bullmqJobId: null,
        createdAt: new Date('2026-07-22T00:00:00.000Z'),
        executionBackend: 'claude',
        hostname: null,
        id: 'cli-run-1',
        pid: null,
        planId: mockPlan.id,
        queueName: PLANS_QUEUE_NAME,
        runConfigSnapshot: null,
        runKind: 'orchestrator',
        status: 'CANCELLED',
        updatedAt: new Date('2026-07-22T00:01:00.000Z'),
        workerId: null,
      });

      const result = await resolver.settleCliPlanRun({
        planRunId: 'cli-run-1',
        status: 'cancelled',
      });

      expect(mockSettleCliRun).toHaveBeenCalledWith('cli-run-1', 'CANCELLED');
      expect(result).toEqual(
        expect.objectContaining({ hostname: null, status: 'CANCELLED' }),
      );
    });

    test('rejects a non-terminal status without touching the service', async () => {
      mockSettleCliRun.mockClear();
      await expect(
        resolver.settleCliPlanRun({
          planRunId: 'cli-run-1',
          status: 'IN_PROGRESS',
        }),
      ).rejects.toThrow(/Invalid settle status/);
      expect(mockSettleCliRun).not.toHaveBeenCalled();
    });

    test('returns null when the run row no longer exists', async () => {
      mockSettleCliRun.mockResolvedValueOnce(null);

      const result = await resolver.settleCliPlanRun({
        planRunId: 'missing',
        status: 'COMPLETED',
      });

      expect(result).toBeNull();
    });
  });

  describe('recordPlanRunHeartbeat', () => {
    test('bumps the heartbeat by run id and maps the refreshed row', async () => {
      mockRecordHeartbeatById.mockClear();
      const now = Date.now();
      mockFindById.mockResolvedValueOnce({
        bullmqJobId: null,
        createdAt: new Date(now - 5_000),
        executionBackend: 'claude',
        hostname: 'laptop-1',
        id: 'cli-run-1',
        lastHeartbeatAt: new Date(now),
        pid: 9999,
        planId: mockPlan.id,
        queueName: PLANS_QUEUE_NAME,
        runConfigSnapshot: null,
        runKind: 'orchestrator',
        status: 'IN_PROGRESS',
        updatedAt: new Date(now),
        workerId: 'cli-abc',
      });

      const result = await resolver.recordPlanRunHeartbeat({
        planRunId: 'cli-run-1',
      });

      expect(mockRecordHeartbeatById).toHaveBeenCalledWith('cli-run-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'cli-run-1', isStale: false }),
      );
    });

    test('returns null when the run row no longer exists', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const result = await resolver.recordPlanRunHeartbeat({
        planRunId: 'missing',
      });

      expect(result).toBeNull();
    });
  });

  describe('registerPlanRunWorktreeCheckout', () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const filesystemPath =
      '/Users/matt/.cursor/worktrees/openthrottle/auto-register';

    test('delegates to the service with the actor user id and maps the run', async () => {
      mockRegisterWorktreeCheckout.mockResolvedValueOnce({
        bullmqJobId: null,
        checkoutId: '44444444-4444-4444-8444-444444444444',
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
        executionBackend: 'claude',
        hostname: null,
        id: 'cli-run-1',
        pid: null,
        planId: mockPlan.id,
        queueName: PLANS_QUEUE_NAME,
        runConfigSnapshot: null,
        runKind: 'orchestrator',
        status: 'IN_PROGRESS',
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
        workerId: null,
      });

      const result = await resolver.registerPlanRunWorktreeCheckout(
        { filesystemPath, planRunId: 'cli-run-1' },
        userId,
        AUTH_PRINCIPAL_KIND_USER,
      );

      expect(mockRegisterWorktreeCheckout).toHaveBeenCalledWith({
        filesystemPath,
        planRunId: 'cli-run-1',
        userId,
      });
      expect(result).toEqual(
        expect.objectContaining({
          checkoutId: '44444444-4444-4444-8444-444444444444',
          id: 'cli-run-1',
        }),
      );
    });

    test('rejects service-account principals without calling the service', async () => {
      mockRegisterWorktreeCheckout.mockClear();

      await expect(
        resolver.registerPlanRunWorktreeCheckout(
          { filesystemPath, planRunId: 'cli-run-1' },
          'sa-1',
          'service_account',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mockRegisterWorktreeCheckout).not.toHaveBeenCalled();
    });

    test('returns null when the service soft-fails with a missing run', async () => {
      mockRegisterWorktreeCheckout.mockResolvedValueOnce(null);

      const result = await resolver.registerPlanRunWorktreeCheckout(
        { filesystemPath, planRunId: 'missing' },
        userId,
        AUTH_PRINCIPAL_KIND_USER,
      );

      expect(result).toBeNull();
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
      const created: Plan = {
        ...mockPlan,
        createdAt: new Date(),
        id: 'new-id',
        title: input.title,
        updatedAt: new Date(),
      };
      mockPlanCreationService.createPlanFromInput.mockResolvedValue(created);

      const result = await resolver.createPlan(input);

      expect(mockPlanCreationService.createPlanFromInput).toHaveBeenCalledWith(
        input,
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('new-id');
      expect(result?.title).toBe(input.title);
    });

    test('creates plan with projectId null when projectId omitted', async () => {
      const input: CreatePlanInput = {
        assignee: null,
        author: 'visormatt',
        category: 'openthrottle-server',
        description: null,
        project: null,
        status: null,
        summary: null,
        title: 'Plan without project',
      };
      const created: Plan = {
        ...mockPlan,
        id: 'no-project-id',
        projectId: null,
        title: input.title,
      };
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
      const parsed: {
        target: { mode: string };
        version: number;
      } = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.target.mode).toBe('plan');
    });

    test('normalizes legacy version-only shell from DB', () => {
      const planShellOnly: Plan = {
        ...mockPlan,
        // @ts-expect-error legacy plans.run_config rows predate the ralph/target/workspace fields.
        runConfig: { version: 1 },
      };
      const json = resolver.runConfigJson(planShellOnly);
      const parsed: {
        ralph: { executionBackend: string };
        version: number;
      } = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.ralph.executionBackend).toBeDefined();
    });
  });

  describe('hasCustomRunConfig', () => {
    test('returns false for default run_config', () => {
      expect(resolver.hasCustomRunConfig(mockPlan)).toBe(false);
    });

    test('returns false for legacy version-only shell from DB', () => {
      const planShellOnly: Plan = {
        ...mockPlan,
        // @ts-expect-error legacy plans.run_config rows predate the ralph/target/workspace fields.
        runConfig: { version: 1 },
      };
      expect(resolver.hasCustomRunConfig(planShellOnly)).toBe(false);
    });

    test('returns true when run_config differs from defaults', () => {
      const planWithCustomConfig: Plan = {
        ...mockPlan,
        runConfig: {
          ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }),
          ralph: {
            ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }).ralph,
            iterations: 42,
          },
        },
      };
      expect(resolver.hasCustomRunConfig(planWithCustomConfig)).toBe(true);
    });
  });

  describe('jobRunHooksJson', () => {
    test('serializes plan job_run_hooks column', () => {
      const planWithHooks: Plan = {
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
      };
      const json = resolver.jobRunHooksJson(planWithHooks);
      const parsed: { hooks: { phase: string }[] } = JSON.parse(json);
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
      vi.mocked(repo.save).mockImplementation(() =>
        Promise.resolve(createMock<Plan>()),
      );

      await resolver.updatePlan({
        id: mockPlan.id,
        runConfigJson: configJson,
      });

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
      const planWithCustomConfig: Plan = {
        ...mockPlan,
        runConfig: {
          ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }),
          ralph: {
            ...getDefaultPlanRunConfigStorage({ planId: mockPlan.id }).ralph,
            iterations: 99,
          },
        },
      };
      vi.mocked(repo.findOne).mockResolvedValue(planWithCustomConfig);
      vi.mocked(repo.save).mockImplementation(() =>
        Promise.resolve(createMock<Plan>()),
      );

      await resolver.updatePlan({
        id: mockPlan.id,
        runConfigJson: null,
      });

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
      vi.mocked(repo.save).mockImplementation(() =>
        Promise.resolve(createMock<Plan>()),
      );

      await resolver.updatePlan({
        id: mockPlan.id,
        jobRunHooksJson: hooksJson,
      });

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
      const planWithProject: Plan = {
        ...mockPlan,
        id: 'plan-with-project',
        projectId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      };
      vi.mocked(repo.findOne).mockResolvedValue(planWithProject);
      const saved: Plan = { ...planWithProject, projectId: null };
      vi.mocked(repo.save).mockResolvedValue(saved);

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
        const pending: Plan = { ...mockPlan, status: 'PENDING' };
        const saved: Plan = { ...pending, status: 'IN_PROGRESS' };
        vi.mocked(repo.findOne).mockResolvedValue(pending);
        vi.mocked(repo.save).mockClear();
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

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
        const pending: Plan = { ...mockPlan, status: 'pending' };
        const saved: Plan = { ...pending, status: 'IN_PROGRESS' };
        vi.mocked(repo.findOne).mockResolvedValue(pending);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'in_progress',
        };

        await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'IN_PROGRESS' }),
        );
      });

      test('transitions QUEUED to IN_PROGRESS and persists', async () => {
        const repo = plansService.getRepository();
        const queued: Plan = { ...mockPlan, status: 'QUEUED' };
        const saved: Plan = { ...queued, status: 'IN_PROGRESS' };
        vi.mocked(repo.findOne).mockResolvedValue(queued);
        vi.mocked(repo.save).mockClear();
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

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
        const queued: Plan = { ...mockPlan, status: 'queued' };
        const saved: Plan = { ...queued, status: 'IN_PROGRESS' };
        vi.mocked(repo.findOne).mockResolvedValue(queued);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

        await resolver.updatePlan(input);

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'IN_PROGRESS' }),
        );
      });

      test('throws BadRequestException when COMPLETED plan requests IN_PROGRESS with no other changes', async () => {
        const repo = plansService.getRepository();
        const completed: Plan = { ...mockPlan, status: 'COMPLETED' };
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockClear();

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

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
        const blocked: Plan = { ...mockPlan, status: 'BLOCKED' };
        vi.mocked(repo.findOne).mockResolvedValue(blocked);
        vi.mocked(repo.save).mockClear();

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

        await expect(resolver.updatePlan(input)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(repo.save).not.toHaveBeenCalled();
      });

      test('returns unchanged plan without save when already IN_PROGRESS and input requests IN_PROGRESS', async () => {
        const repo = plansService.getRepository();
        const inProgress: Plan = { ...mockPlan, status: 'IN_PROGRESS' };
        vi.mocked(repo.findOne).mockResolvedValue(inProgress);
        vi.mocked(repo.save).mockClear();

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
        };

        const result = await resolver.updatePlan(input);

        expect(result?.status).toBe('IN_PROGRESS');
        expect(repo.save).not.toHaveBeenCalled();
      });

      test('persists other fields when invalid IN_PROGRESS is requested but another field changes', async () => {
        const repo = plansService.getRepository();
        const completed: Plan = {
          ...mockPlan,
          status: 'COMPLETED',
          title: 'Old',
        };
        const saved: Plan = { ...completed, title: 'New title' };
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockResolvedValue(saved);

        const input: UpdatePlanInput = {
          id: mockPlan.id,
          status: 'IN_PROGRESS',
          title: 'New title',
        };

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

    describe('completedAt write path', () => {
      test('stamps completedAt when transitioning into COMPLETED', async () => {
        const repo = plansService.getRepository();
        const pending: Plan = {
          ...mockPlan,
          completedAt: null,
          status: 'IN_PROGRESS',
        };
        const saved: Plan = {
          ...pending,
          completedAt: new Date('2026-07-10T12:00:00.000Z'),
          status: 'COMPLETED',
        };
        vi.mocked(repo.findOne).mockResolvedValue(pending);
        vi.mocked(repo.save).mockResolvedValue(saved);

        await resolver.updatePlan({
          id: mockPlan.id,
          status: 'COMPLETED',
        });

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completedAt: expect.any(Date),
            status: 'COMPLETED',
          }),
        );
      });

      test('does not overwrite completedAt when editing a COMPLETED plan without status change', async () => {
        const repo = plansService.getRepository();
        const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
        const completed: Plan = {
          ...mockPlan,
          completedAt: existingCompletedAt,
          status: 'COMPLETED',
          title: 'Old',
        };
        const saved: Plan = { ...completed, title: 'New title' };
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockResolvedValue(saved);

        await resolver.updatePlan({
          id: mockPlan.id,
          title: 'New title',
        });

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completedAt: existingCompletedAt,
            status: 'COMPLETED',
            title: 'New title',
          }),
        );
      });

      test('clears completedAt when leaving COMPLETED', async () => {
        const repo = plansService.getRepository();
        const existingCompletedAt = new Date('2026-06-01T08:00:00.000Z');
        const completed: Plan = {
          ...mockPlan,
          completedAt: existingCompletedAt,
          status: 'COMPLETED',
        };
        const saved: Plan = {
          ...completed,
          completedAt: null,
          status: 'PENDING',
        };
        vi.mocked(repo.findOne).mockResolvedValue(completed);
        vi.mocked(repo.save).mockResolvedValue(saved);

        await resolver.updatePlan({
          id: mockPlan.id,
          status: 'PENDING',
        });

        expect(repo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completedAt: null,
            status: 'PENDING',
          }),
        );
      });
    });
  });

  describe('evaluatePlanRules', () => {
    beforeEach(() => {
      mockEnqueueEvaluation.mockClear();
    });

    test('enqueues a full pass with the manual trigger kind and acks', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.evaluatePlanRules(mockPlan.id);

      expect(mockEnqueueEvaluation).toHaveBeenCalledTimes(1);
      expect(mockEnqueueEvaluation).toHaveBeenCalledWith(
        mockPlan.id,
        PLAN_RULES_TRIGGER_KINDS.MANUAL,
      );
      expect(result).toEqual({
        enqueued: true,
        planId: mockPlan.id,
        triggerKind: PLAN_RULES_TRIGGER_KINDS.MANUAL,
      });
    });

    test('rejects and does not enqueue when the plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      await expect(
        resolver.evaluatePlanRules('non-existent-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEnqueueEvaluation).not.toHaveBeenCalled();
    });

    test('is guarded by the PLANS_WRITE permission', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        resolver.evaluatePlanRules,
      );

      expect(permissions).toEqual([PERMISSIONS.PLANS_WRITE]);
    });
  });
});
