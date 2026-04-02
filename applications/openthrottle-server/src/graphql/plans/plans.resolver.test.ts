import { createMock } from '@golevelup/ts-vitest';
import {
  PlansService,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Plan } from '@openthrottle/nestjs-repositories';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import {
  CreatePlanInput,
  EnqueuePlanRunInput,
  ListPlansByStatusInput,
  RalphNestedDebugCliGraphQL,
  SetPlanStatusInput,
  UpdatePlanInput,
} from './plan.input';
import { PlansResolver } from './plans.resolver';

vi.mock('@openthrottle/ai-mcp/src/cortex-server', () => ({
  getCortexPostgresConfig: vi.fn(),
  searchPlansBySemanticQuery: vi.fn(),
}));

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
    project: null,
    projectId: null,
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
    update: vi.fn().mockResolvedValue(undefined),
  };
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(taskRepo),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlansResolver,
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
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
  });

  describe('listPlansByStatus', () => {
    test('returns plans and totalCount from query builder (no filters)', async () => {
      const [entities, count] = [[mockPlan as Plan], 1];
      const qbMock = createQueryBuilderMock([entities, count]);
      const repo = plansService.getRepository();
      vi.mocked(repo.createQueryBuilder).mockReturnValue(
        qbMock.chain as ReturnType<typeof repo.createQueryBuilder>,
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
        qbMock.chain as ReturnType<typeof repo.createQueryBuilder>,
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
        qbMock.chain as ReturnType<typeof repo.createQueryBuilder>,
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
        qbMock.chain as ReturnType<typeof repo.createQueryBuilder>,
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
      const { getCortexPostgresConfig } =
        await import('@openthrottle/ai-mcp/src/cortex-server');
      vi.mocked(getCortexPostgresConfig).mockReturnValue(undefined);

      const result = await resolver.searchPlans({ query: 'some query' });

      expect(result.plans).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    test('returns mapped plans when semantic search returns results', async () => {
      const { getCortexPostgresConfig, searchPlansBySemanticQuery } =
        await import('@openthrottle/ai-mcp/src/cortex-server');
      vi.mocked(getCortexPostgresConfig).mockReturnValue({
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
    test('returns job id, plan id, and queue position when plan exists', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);

      const result = await resolver.enqueuePlanRun({
        planId: mockPlan.id,
        priority: null,
      });

      expect(result).not.toBeNull();
      expect(result.jobId).toBe('job-1');
      expect(result.planId).toBe(mockPlan.id);
      expect(result.queuePosition).toBe(1);
      expect(result.queueTotal).toBe(1);
    });

    test('throws when plan does not exist', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const input: EnqueuePlanRunInput = {
        planId: 'non-existent-id',
        priority: null,
      };
      await expect(resolver.enqueuePlanRun(input)).rejects.toThrow(
        'Plan not found: non-existent-id',
      );
    });

    test('sets non-completed tasks to QUEUED (PENDING, IN_PROGRESS, BLOCKED, BACKLOG, SKIPPED, CANCELED)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.update.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });

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
    });

    test('does not update COMPLETED tasks to QUEUED', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.update.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });

      const [criteria] = taskRepo.update.mock.calls[0] as [
        { planId: string; status: { value: readonly string[] } },
        { status: string },
      ];
      expect(criteria.status.value).not.toContain('COMPLETED');
    });

    test('re-queue calls task update again (idempotent behavior)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      taskRepo.update.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });
      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });

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

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: 1 });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { planId: mockPlan.id },
        { priority: 1 },
      );
    });

    test('uses default priority (10) when priority is null', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { planId: mockPlan.id },
        { priority: 10 },
      );
    });

    test('omits ralph from queue job data when ralph input is not provided', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: null });

      const jobData = mockAdd.mock.calls[0]?.[1];
      expect(jobData).toEqual({ planId: mockPlan.id });
      expect(jobData).not.toHaveProperty('ralph');
    });

    test('accepts batch priority (100)', async () => {
      const repo = plansService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockPlan);
      mockAdd.mockClear();

      await resolver.enqueuePlanRun({ planId: mockPlan.id, priority: 100 });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        { planId: mockPlan.id },
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
          ralphDebugCli: RalphNestedDebugCliGraphQL.verbose,
        },
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'run-plan',
        expect.objectContaining({
          planId: mockPlan.id,
          ralph: expect.objectContaining({
            backend: 'cursor',
            iterationTimeoutSeconds: 120,
            iterations: 5,
            project: 'applications/openthrottle-server',
            ralphDebugCli: 'verbose',
          }),
        }),
        { priority: 10 },
      );
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
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancelPlanRun', () => {
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
      taskRepo.update.mockClear();

      const result = await resolver.cancelPlanRun({ planId: mockPlan.id });

      expect(remove).toHaveBeenCalledOnce();
      expect(result.removedJobIds).toEqual(['job-99']);
      expect(result.noMatchingJob).toBe(false);
      expect(result.planStatusAfter).toBe('PENDING');
      expect(repo.update).toHaveBeenCalledWith(
        { id: mockPlan.id },
        { status: 'PENDING' },
      );
      expect(taskRepo.update).toHaveBeenCalledWith(
        { planId: mockPlan.id, status: 'QUEUED' },
        { status: 'PENDING' },
      );
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
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    test('creates plan from input and returns PlanObject', async () => {
      const repo = plansService.getRepository();
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
      vi.mocked(repo.create).mockReturnValue(created as Plan);
      vi.mocked(repo.save).mockResolvedValue(created as Plan);

      const result = await resolver.createPlan(input);

      expect(repo.create).toHaveBeenCalledWith({
        assignee: null,
        author: input.author,
        category: input.category,
        description: null,
        project: null,
        projectId: null,
        status: 'PENDING',
        summary: null,
        title: input.title,
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('new-id');
      expect(result?.title).toBe(input.title);
    });

    test('creates plan with projectId null when projectId omitted', async () => {
      const repo = plansService.getRepository();
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
      vi.mocked(repo.create).mockReturnValue(created);
      vi.mocked(repo.save).mockResolvedValue(created);

      const result = await resolver.createPlan(input);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: null,
          title: 'Plan without project',
        }),
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

  describe('updatePlan', () => {
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
        id: planWithProject.id,
        projectId: null,
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
  });
});
