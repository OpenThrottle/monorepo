/**
 * @description Resolver for Plan queries and mutations. Injects PlansService from @openthrottle/nestjs-repositories and maps Plan entities to PlanObject.
 */

import {
  getPostgresConfig,
  searchPlansBySemanticQuery,
} from '@openthrottle/ai-mcp/src/cortex-server';
import type { PlanStatusCount } from '@openthrottle/ai-mcp/src/cortex-server';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ProfileResponseTime } from '@openthrottle/nestjs-profiling';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import {
  getDefaultPlanRunConfigStorage,
  parsePlanRunConfigJson,
  PlansService,
  PlanRunsService,
  planRunConfigFromPlanStorage,
  ProjectsService,
  serializePlanRunConfigForGraphql,
  serializePlanRunConfigSnapshotForGraphql,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { In } from 'typeorm';
import type { Project } from '@openthrottle/nestjs-repositories';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  PLAN_JOB_PRIORITY_DEFAULT,
  PLANS_QUEUE_NAME,
  RUN_PLAN_SPAWN_JOB_NAME,
} from '../../queues/plans/plans.constants';
import { PlanRunCancellationService } from '../../queues/plans/plan-run-cancellation.service';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { PlanCreationService } from '../../services/plan-creation/plan-creation.service';
import { ProjectObject } from '../projects/project.object';
import { QueuesService } from '../queues/queues.service';
import { cancelPlanRunJobsForPlan } from './cancel-plan-run-jobs';
import {
  parseJobRunHooksJsonInput,
  serializeJobRunHooksForGraphql,
} from './enqueue-plan-job-run-hooks';
import {
  buildRunPlanJobData,
  buildRunPlanOrchestratorJobData,
} from './enqueue-plan-ralph-tuning';
import { buildPlanRunConfigSnapshotFromJobData } from './enqueue-plan-run-config-snapshot';
import {
  CancelPlanRunInput,
  CreatePlanInput,
  DeletePlanInput,
  EnqueuePlanRalphOrchestratorInput,
  EnqueuePlanRunInput,
  ListPlansByStatusInput,
  PlanRalphWorkflowModeGraphQL,
  PlanRunsByPlanIdInput,
  SearchPlansInput,
  SetPlanStatusInput,
  UpdatePlanInput,
} from './plan.input';
import {
  CancelPlanRunResultObject,
  EnqueuePlanRunResultObject,
  ListPlansByStatusResultObject,
  PlanObject,
  PlanRunObject,
  PlanStatusCountObject,
} from './plan.object';

const DEFAULT_SEARCH_PLANS_LIMIT = 20;
const DEFAULT_PLAN_RUNS_LIMIT = 20;
const MAX_PLAN_RUNS_LIMIT = 100;
const IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE = `Cannot transition to IN_PROGRESS: only PENDING plans may enter this state.`;

/**
 * @description Normalizes plan status for policy checks (GraphQL and DB may differ in case).
 */
function normalizePlanStatusForPolicy(status: string): string {
  return status.trim().toUpperCase();
}

/**
 * @description cortex-ralph parity: `UPDATE … SET status = 'IN_PROGRESS' WHERE status = 'PENDING'`. Also allows idempotent `IN_PROGRESS` when already `IN_PROGRESS`.
 */
function canApplyInProgressAsTargetStatus(currentStatus: string): boolean {
  const s = normalizePlanStatusForPolicy(currentStatus);
  return s === 'PENDING' || s === 'IN_PROGRESS';
}

@Resolver(() => PlanObject)
export class PlansResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly planCreationService: PlanCreationService,
    private readonly planRunCancellation: PlanRunCancellationService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly projectsService: ProjectsService,
    private readonly queuesService: QueuesService,
    private readonly tasksService: TasksService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  // @ProfileResponseTime('PlansResolver.projectRelation')
  @ResolveField(() => ProjectObject, {
    description: `Resolved project entity when projectId is set`,
    nullable: true,
  })
  async projectRelation(@Parent() parent: PlanObject): Promise<Project | null> {
    if (!parent.projectId) return null;

    const project = await this.projectsService.findById(parent.projectId);

    return project;
  }

  @ResolveField(() => String, {
    description: `Job-run lifecycle hooks stored on the plan ({ hooks: [...] }).`,
  })
  jobRunHooksJson(@Parent() parent: PlanObject): string {
    const stored = (parent as PlanObject & { jobRunHooks?: unknown })
      .jobRunHooks;
    if (stored !== undefined && stored !== null) {
      return serializeJobRunHooksForGraphql(
        stored as Parameters<typeof serializeJobRunHooksForGraphql>[0],
      );
    }
    return serializeJobRunHooksForGraphql({ hooks: [] });
  }

  @ResolveField(() => String, {
    description: `Workflow-ralph run configuration stored on the plan (PlanRunConfigStorage v1).`,
  })
  runConfigJson(@Parent() parent: PlanObject): string {
    const stored = (parent as PlanObject & { runConfig?: unknown }).runConfig;
    return serializePlanRunConfigForGraphql(
      stored as Parameters<typeof serializePlanRunConfigForGraphql>[0],
      { planId: parent.id },
    );
  }

  // @ProfileResponseTime('PlansResolver.taskCount')
  @ResolveField(() => Int, {
    description: 'Number of tasks belonging to this plan',
  })
  async taskCount(@Parent() parent: PlanObject): Promise<number> {
    return this.tasksService
      .getRepository()
      .count({ where: { planId: parent.id } });
  }

  private mapPlanRunObject(planRun: PlanRun): PlanRunObject {
    const out = new PlanRunObject();

    out.bullmqJobId = planRun.bullmqJobId;
    out.createdAt = planRun.createdAt;
    out.executionBackend = planRun.executionBackend;
    out.id = planRun.id;
    out.planId = planRun.planId;
    out.queueName = planRun.queueName;
    out.runConfigSnapshotJson = serializePlanRunConfigSnapshotForGraphql(
      planRun.runConfigSnapshot,
    );
    out.runKind = planRun.runKind;
    out.status = planRun.status;
    out.updatedAt = planRun.updatedAt;

    return out;
  }

  @Query(() => [PlanRunObject], {
    description: `Recent persisted Ralph plan runs for a plan, newest first. Each row stores exactly one execution backend.`,
  })
  async planRunsByPlanId(
    @Args('input', { type: () => PlanRunsByPlanIdInput })
    input: PlanRunsByPlanIdInput,
  ): Promise<PlanRunObject[]> {
    const effectiveLimit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_PLAN_RUNS_LIMIT),
      MAX_PLAN_RUNS_LIMIT,
    );
    const runs = await this.planRunsService.findRecentByPlanId(
      input.planId,
      effectiveLimit,
    );

    return runs.map((run) => this.mapPlanRunObject(run));
  }

  // @ProfileResponseTime('PlansResolver.plan')
  @Query(() => PlanObject, {
    description: `Get a plan by ID`,
    nullable: true,
  })
  async plan(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PlanObject | null> {
    const entity = await this.plansService
      .getRepository()
      .findOne({ where: { id } });

    return entity;
  }

  // @ProfileResponseTime('PlansResolver.plans')
  @Query(() => [PlanObject], {
    description: `List all plans`,
  })
  async plans(): Promise<PlanObject[]> {
    const entities = await this.plansService.getRepository().find({
      order: { createdAt: 'DESC' },
    });

    return entities;
  }

  // @ProfileResponseTime('PlansResolver.listPlansByStatus')
  @Query(() => ListPlansByStatusResultObject, {
    description: `List plans filtered by status(es), assignee(s), project, title; sorted and paginated. Pass statuses/assignees arrays; empty or "all" in statuses means no status filter.`,
  })
  async listPlansByStatus(
    @Args('input', { type: () => ListPlansByStatusInput })
    input: ListPlansByStatusInput,
  ): Promise<ListPlansByStatusResultObject> {
    const repo = this.plansService.getRepository();
    const orderColumn = input.sortBy === 'updated' ? 'updatedAt' : 'createdAt';
    const orderDir = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const take = input.limit ?? 20;
    const skip = input.offset ?? 0;
    const statusList =
      input.statuses
        ?.filter((s) => s != null && String(s).trim() !== '')
        .map((s) => String(s).trim().toUpperCase()) ?? [];

    const showAllStatuses =
      statusList.length === 0 ||
      input.statuses?.some((s) => String(s).trim().toLowerCase() === 'all');

    const assigneeList =
      input.assignees
        ?.filter((a) => a != null && String(a).trim() !== '')
        .map((a) => String(a).trim()) ?? [];

    const qb = repo
      .createQueryBuilder('plan')
      .select([
        'plan.assignee',
        'plan.author',
        'plan.category',
        'plan.createdAt',
        'plan.id',
        'plan.project',
        'plan.projectId',
        'plan.status',
        'plan.summary',
        'plan.title',
        'plan.updatedAt',
      ])
      .orderBy(`plan.${orderColumn}`, orderDir)
      .take(take)
      .skip(skip);

    // Use explicit param names (e.g. status_0, status_1) instead of :...statuses so TypeORM binds arrays correctly.
    if (!showAllStatuses && statusList.length > 0) {
      const statusParams = statusList.map((_, i) => `status_${i}`);
      qb.andWhere(
        `plan.status IN (${statusParams.map((p) => `:${p}`).join(', ')})`,
        Object.fromEntries(
          statusList.map((s, i) => [`status_${i}`, String(s).trim()]),
        ),
      );
    }

    if (assigneeList.length > 0) {
      const assigneeParams = assigneeList.map((_, i) => `assignee_${i}`);
      const placeholders = assigneeParams.map((p) => `:${p}`).join(', ');

      qb.andWhere(
        `(plan.author IN (${placeholders}) OR plan.assignee IN (${placeholders}))`,
        Object.fromEntries(assigneeList.map((a, i) => [`assignee_${i}`, a])),
      );
    }

    if (input.project?.trim()) {
      qb.andWhere('plan.project = :project', {
        project: input.project.trim(),
      });
    }

    if (input.projectId?.trim()) {
      qb.andWhere('plan.projectId = :projectId', {
        projectId: input.projectId.trim(),
      });
    }

    if (input.titleSubstring?.trim()) {
      qb.andWhere('plan.title ILIKE :titlePattern', {
        titlePattern: `%${input.titleSubstring.trim()}%`,
      });
    }

    const [entities, totalCount] = await qb.getManyAndCount();
    const result = new ListPlansByStatusResultObject();

    result.plans = entities;
    result.totalCount = totalCount;

    return result;
  }

  // @ProfileResponseTime('PlansResolver.listPlanCountsByStatus')
  @Query(() => [PlanStatusCountObject], {
    description: `Plan count per status for sidebar/filters (alias: use planCountsByStatus)`,
  })
  async listPlanCountsByStatus(): Promise<PlanStatusCount[]> {
    return this.fetchPlanCountsByStatus();
  }

  // @ProfileResponseTime('PlansResolver.planCountsByStatus')
  @Query(() => [PlanStatusCountObject], {
    description: `Plan count per status for sidebar/filters`,
  })
  async planCountsByStatus(): Promise<PlanStatusCount[]> {
    return this.fetchPlanCountsByStatus();
  }

  // @ProfileResponseTime('PlansResolver.searchPlans')
  @Query(() => ListPlansByStatusResultObject, {
    description: `Semantic search over plans/tasks (vector similarity). Requires OPENAI_API_KEY or Ollama for query embedding. Returns plans matching the query, deduped by plan id.`,
  })
  async searchPlans(
    @Args('input', { type: () => SearchPlansInput }) input: SearchPlansInput,
  ): Promise<ListPlansByStatusResultObject> {
    const config = getPostgresConfig();

    if (!config) {
      const result = new ListPlansByStatusResultObject();

      result.plans = [];
      result.totalCount = 0;

      return result;
    }

    const result = new ListPlansByStatusResultObject();
    const raw = await searchPlansBySemanticQuery(
      config,
      input.query,
      input.limit ?? DEFAULT_SEARCH_PLANS_LIMIT,
    );

    if (
      !raw ||
      !Array.isArray(raw.plans) ||
      typeof raw.totalCount !== 'number'
    ) {
      result.plans = [];
      result.totalCount = 0;
    } else {
      result.plans = raw.plans;
      result.totalCount = raw.totalCount;
    }

    return result;
  }

  private async fetchPlanCountsByStatus(): Promise<PlanStatusCount[]> {
    const repo = this.plansService.getRepository();
    const rows = (await repo.query(
      'SELECT status, COUNT(*)::int AS count FROM plans GROUP BY status ORDER BY status',
    )) as { count: number; status: string }[];

    return rows.map((r) => {
      const obj = new PlanStatusCountObject();

      obj.status = r.status;
      obj.count = r.count;

      return obj;
    });
  }

  // @ProfileResponseTime('PlansResolver.listDistinctCategories')
  @Query(() => [String], {
    description: `Distinct category values from plans for filters`,
  })
  async listDistinctCategories(): Promise<string[]> {
    const repo = this.plansService.getRepository();
    const rows = (await repo.query(
      'SELECT DISTINCT category FROM plans ORDER BY category',
    )) as { category: string }[];

    return rows.map((r) => r.category);
  }

  // @ProfileResponseTime('PlansResolver.listDistinctAuthorsAndAssignees')
  @Query(() => [String], {
    description: `Distinct author and assignee values from plans and tasks for filters`,
  })
  async listDistinctAuthorsAndAssignees(): Promise<string[]> {
    const repo = this.plansService.getRepository();
    const rows = (await repo.query(
      `(SELECT author AS person FROM plans)
       UNION
       (SELECT assignee AS person FROM plans WHERE assignee IS NOT NULL)
       UNION
       (SELECT assignee AS person FROM tasks WHERE assignee IS NOT NULL)
       ORDER BY person`,
    )) as { person: string }[];

    return rows.map((r) => r.person);
  }

  // @ProfileResponseTime('PlansResolver.createPlan')
  @Mutation(() => PlanObject, {
    description: `Create a plan`,
  })
  @EmitNotification(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, (ret) =>
    ret != null
      ? {
          message: `Plan created: ${(ret as PlanObject).title}`,
          planId: (ret as PlanObject).id,
          severity: 'success' as const,
        }
      : null,
  )
  async createPlan(
    @Args('input', { type: () => CreatePlanInput }) input: CreatePlanInput,
  ): Promise<PlanObject> {
    return this.planCreationService.createPlanFromInput(input);
  }

  // @ProfileResponseTime('PlansResolver.updatePlan')
  @Mutation(() => PlanObject, {
    description: `Update a plan`,
    nullable: true,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        ret != null
          ? {
              message: `Plan updated: ${(ret as PlanObject).title}`,
              planId: (ret as PlanObject).id,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        ret != null
          ? {
              planId: (ret as PlanObject).id,
              status: (ret as PlanObject).status,
            }
          : null,
    },
  ])
  async updatePlan(
    @Args('input', { type: () => UpdatePlanInput }) input: UpdatePlanInput,
  ): Promise<PlanObject | null> {
    const repo = this.plansService.getRepository();
    const entity = await repo.findOne({ where: { id: input.id } });

    if (!entity) return null;

    const requestedInProgress =
      input.status != null &&
      normalizePlanStatusForPolicy(input.status) === 'IN_PROGRESS';
    const inProgressBlocked =
      requestedInProgress && !canApplyInProgressAsTargetStatus(entity.status);

    let touched = false;

    if (input.author != null && input.author !== entity.author) {
      entity.author = input.author;
      touched = true;
    }
    if (input.category != null && input.category !== entity.category) {
      entity.category = input.category;
      touched = true;
    }
    if (input.status != null) {
      const nextStatus = normalizePlanStatusForPolicy(input.status);
      if (
        nextStatus === 'IN_PROGRESS' &&
        !canApplyInProgressAsTargetStatus(entity.status)
      ) {
        // Invalid transition: leave entity.status unchanged (cortex-ralph conditional UPDATE).
      } else if (normalizePlanStatusForPolicy(entity.status) !== nextStatus) {
        entity.status = nextStatus;
        touched = true;
      }
    }
    if (input.title != null && input.title !== entity.title) {
      entity.title = input.title;
      touched = true;
    }

    if (input.assignee !== undefined && input.assignee !== entity.assignee) {
      entity.assignee = input.assignee;
      touched = true;
    }
    if (
      input.description !== undefined &&
      input.description !== entity.description
    ) {
      entity.description = input.description;
      touched = true;
    }
    if (input.project !== undefined && input.project !== entity.project) {
      entity.project = input.project;
      touched = true;
    }
    if (input.projectId !== undefined && input.projectId !== entity.projectId) {
      entity.projectId = input.projectId;
      touched = true;
    }
    if (input.summary !== undefined && input.summary !== entity.summary) {
      entity.summary = input.summary;
      touched = true;
    }
    if (input.jobRunHooksJson !== undefined) {
      if (input.jobRunHooksJson === null) {
        const hookCount = entity.jobRunHooks?.hooks?.length ?? 0;
        if (hookCount > 0) {
          entity.jobRunHooks = { hooks: [] };
          touched = true;
        }
      } else {
        const parsed = parseJobRunHooksJsonInput(input.jobRunHooksJson);
        const next = parsed ?? { hooks: [] };
        const prevJson = JSON.stringify(entity.jobRunHooks);
        const nextJson = JSON.stringify(next);
        if (prevJson !== nextJson) {
          entity.jobRunHooks = next;
          touched = true;
        }
      }
    }
    if (input.runConfigJson !== undefined) {
      const next = parsePlanRunConfigJson(input.runConfigJson);
      if (next !== undefined) {
        const resolved =
          input.runConfigJson === null
            ? getDefaultPlanRunConfigStorage({ planId: entity.id })
            : next;
        const prevJson = JSON.stringify(
          planRunConfigFromPlanStorage(entity.runConfig, {
            planId: entity.id,
          }),
        );
        const nextJson = JSON.stringify(resolved);
        if (prevJson !== nextJson) {
          entity.runConfig = resolved;
          touched = true;
        }
      }
    }

    if (!touched && inProgressBlocked) {
      throw new BadRequestException(IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE);
    }

    if (!touched) {
      return entity;
    }

    return repo.save(entity);
  }

  // @ProfileResponseTime('PlansResolver.setPlanStatus')
  @Mutation(() => PlanObject, {
    description: `Set a plan's status (e.g. COMPLETED). Convenience mutation for Mark Complete; equivalent to updatePlan with { id, status }.`,
    nullable: true,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        ret != null
          ? {
              message: `Plan status updated: ${(ret as PlanObject).title} → ${(ret as PlanObject).status}`,
              planId: (ret as PlanObject).id,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        ret != null
          ? {
              planId: (ret as PlanObject).id,
              status: (ret as PlanObject).status,
            }
          : null,
    },
  ])
  async setPlanStatus(
    @Args('input', { type: () => SetPlanStatusInput })
    input: SetPlanStatusInput,
  ): Promise<PlanObject | null> {
    const repo = this.plansService.getRepository();
    const entity = await repo.findOne({ where: { id: input.planId } });

    if (!entity) return null;

    const nextStatus = input.status.trim().toUpperCase();
    if (
      nextStatus === 'IN_PROGRESS' &&
      !canApplyInProgressAsTargetStatus(entity.status)
    ) {
      throw new BadRequestException(IN_PROGRESS_TRANSITION_FORBIDDEN_MESSAGE);
    }

    if (normalizePlanStatusForPolicy(entity.status) === nextStatus) {
      return entity;
    }

    entity.status = nextStatus;

    return repo.save(entity);
  }

  // @ProfileResponseTime('PlansResolver.deletePlan')
  @Mutation(() => Boolean, {
    description: `Delete a plan by ID`,
  })
  async deletePlan(
    @Args('input', { type: () => DeletePlanInput }) input: DeletePlanInput,
  ): Promise<boolean> {
    const repo = this.plansService.getRepository();
    const result = await repo.delete({ id: input.id });

    return (result.affected ?? 0) > 0;
  }

  @ProfileResponseTime('PlansResolver.enqueuePlanRun')
  @Mutation(() => EnqueuePlanRunResultObject, {
    description: `Canonical mutation to enqueue a spawn plan-run job (nested workflow-ralph in the worker). Used by the Developer app "Run plan" action and external clients. Returns job id, plan id, and queue position. For in-process orchestrator runs use enqueuePlanRalphOrchestrator instead.`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        ret != null
          ? {
              message: 'Plan queued for run',
              planId: (ret as EnqueuePlanRunResultObject).planId,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        ret != null
          ? {
              planId: (ret as EnqueuePlanRunResultObject).planId,
              status: 'QUEUED',
            }
          : null,
    },
  ])
  async enqueuePlanRun(
    @Args('input', { type: () => EnqueuePlanRunInput })
    input: EnqueuePlanRunInput,
  ): Promise<EnqueuePlanRunResultObject> {
    const { jobRunHooksJson, planId, priority, ralph, workingDirectory } =
      input;

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 3 - Plan not found: ${planId}`);
    }

    let jobData: RunPlanJobData;
    try {
      jobData = buildRunPlanJobData({
        jobRunHooksJson,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        workingDirectory,
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      throw new BadRequestException(message);
    }

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;
    const job = await this.plansQueue.add(RUN_PLAN_SPAWN_JOB_NAME, jobData, {
      priority: jobPriority,
    });
    const jobId = String(job.id ?? job.name);
    const runConfigSnapshot = buildPlanRunConfigSnapshotFromJobData(jobData);

    await this.planRunsService.recordQueuedRun({
      bullmqJobId: jobId,
      executionBackend: jobData.executionBackend ?? 'cursor',
      planId,
      queueName: PLANS_QUEUE_NAME,
      runConfigSnapshot,
      runKind: 'spawn',
    });

    await repo.update({ id: planId }, { status: 'QUEUED' });

    const taskRepo = this.tasksService.getRepository();
    const statusesToReset = [
      'PENDING',
      'IN_PROGRESS',
      'BLOCKED',
      'BACKLOG',
      'SKIPPED',
      'CANCELED',
    ] as const;

    await taskRepo.update(
      {
        planId,
        status: In(statusesToReset),
      },
      { status: 'QUEUED' },
    );

    const waitingCount = await this.plansQueue.getWaitingCount();
    const waitingJobs = await this.plansQueue.getJobs(['waiting'], 0, 500);
    const jobIndex = waitingJobs.findIndex((j) => j.id === job.id);
    const queuePosition = jobIndex >= 0 ? jobIndex + 1 : waitingCount;
    const queueTotal = waitingCount;

    this.notificationsService.emitPlanEnqueued({
      planId,
      queuePosition,
      queueTotal,
    });

    const result = new EnqueuePlanRunResultObject();

    result.executionBackend = jobData.executionBackend ?? 'cursor';
    result.jobId = jobId;
    result.planId = planId;
    result.queuePosition = queuePosition;
    result.queueTotal = queueTotal;

    return result;
  }

  /** Timing is captured by {@link PlansResolver.enqueuePlanRun} (this alias delegates there). */
  @Mutation(() => EnqueuePlanRunResultObject, {
    deprecationReason: `Use enqueuePlanRun. Identical spawn enqueue behavior; retained for backward-compatible clients only.`,
    description: `Deprecated alias for enqueuePlanRun. Enqueues a spawn plan-run job with the same input and result shape.`,
  })
  async workflowPlanRun(
    @Args('input', { type: () => EnqueuePlanRunInput })
    input: EnqueuePlanRunInput,
  ): Promise<EnqueuePlanRunResultObject> {
    return this.enqueuePlanRun(input);
  }

  @ProfileResponseTime('PlansResolver.enqueuePlanRalphOrchestrator')
  @Mutation(() => EnqueuePlanRunResultObject, {
    description: `Enqueue an in-process Ralph orchestrator job (GraphQL-backed pipeline, no nested workflow-ralph process). Same queue position and plan/task status updates as enqueuePlanRun.`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        ret != null
          ? {
              message: 'Plan queued for run (orchestrator)',
              planId: (ret as EnqueuePlanRunResultObject).planId,
              severity: 'info' as const,
            }
          : null,
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        ret != null
          ? {
              planId: (ret as EnqueuePlanRunResultObject).planId,
              status: 'QUEUED',
            }
          : null,
    },
  ])
  async enqueuePlanRalphOrchestrator(
    @Args('input', { type: () => EnqueuePlanRalphOrchestratorInput })
    input: EnqueuePlanRalphOrchestratorInput,
  ): Promise<EnqueuePlanRunResultObject> {
    const {
      idempotencyKey,
      jobRunHooksJson,
      planId,
      priority,
      ralph,
      taskId,
      workingDirectory,
    } = input;
    const modeGraphql = input.mode;

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 1 - Plan not found: ${planId}`);
    }

    const taskRepo = this.tasksService.getRepository();

    const mode =
      modeGraphql === PlanRalphWorkflowModeGraphQL.task
        ? ('task' as const)
        : modeGraphql === PlanRalphWorkflowModeGraphQL.plan
          ? ('plan' as const)
          : null;

    if (mode === 'task' && (taskId === null || taskId === undefined)) {
      throw new BadRequestException('taskId is required when mode is task');
    }

    if (mode === 'task' && taskId != null) {
      const task = await taskRepo.findOne({
        where: { id: taskId.trim(), planId },
      });
      if (!task) {
        throw new BadRequestException(
          `Task not found for this plan: ${taskId}`,
        );
      }
    }

    let jobData: ReturnType<typeof buildRunPlanOrchestratorJobData>;
    try {
      jobData = buildRunPlanOrchestratorJobData({
        jobRunHooksJson,
        mode,
        planId,
        planJobRunHooks: plan.jobRunHooks,
        ralph,
        taskId,
        workingDirectory,
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      throw new BadRequestException(message);
    }

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;

    const enqueueResult = await this.queuesService.enqueuePlanRalphOrchestrator(
      {
        idempotencyKey: idempotencyKey ?? undefined,
        jobData,
        priority: jobPriority,
      },
    );

    if ('error' in enqueueResult) {
      throw new BadRequestException(enqueueResult.error);
    }

    await this.planRunsService.recordQueuedRun({
      bullmqJobId: enqueueResult.jobId,
      executionBackend: jobData.executionBackend ?? 'cursor',
      planId,
      queueName: PLANS_QUEUE_NAME,
      runConfigSnapshot: buildPlanRunConfigSnapshotFromJobData(jobData),
      runKind: 'orchestrator',
    });

    await repo.update({ id: planId }, { status: 'QUEUED' });

    const statusesToReset = [
      'PENDING',
      'IN_PROGRESS',
      'BLOCKED',
      'BACKLOG',
      'SKIPPED',
      'CANCELED',
    ] as const;
    await taskRepo.update(
      {
        planId,
        status: In(statusesToReset),
      },
      { status: 'QUEUED' },
    );

    const waitingCount = await this.plansQueue.getWaitingCount();
    const waitingJobs = await this.plansQueue.getJobs(['waiting'], 0, 500);
    const jobIndex = waitingJobs.findIndex(
      (j) => String(j.id) === enqueueResult.jobId,
    );
    const queuePosition = jobIndex >= 0 ? jobIndex + 1 : waitingCount;
    const queueTotal = waitingCount;

    this.notificationsService.emitPlanEnqueued({
      planId,
      queuePosition,
      queueTotal,
    });

    const result = new EnqueuePlanRunResultObject();
    result.executionBackend = jobData.executionBackend ?? 'cursor';
    result.jobId = enqueueResult.jobId;
    result.planId = planId;
    result.queuePosition = queuePosition;
    result.queueTotal = queueTotal;

    return result;
  }

  // @ProfileResponseTime('PlansResolver.cancelPlanRun')
  @Mutation(() => CancelPlanRunResultObject, {
    description: `Cancel BullMQ plan-run jobs for a plan: removes waiting or delayed jobs, and signals the worker to stop the Ralph child when a job is active (cannot be removed from Redis without the lock token).`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) => {
        if (ret == null) return null;
        const r = ret as CancelPlanRunResultObject;
        if (r.removedJobIds.length > 0) {
          return {
            message: 'Plan run cancelled (removed from queue)',
            planId: r.planId,
            severity: 'info' as const,
          };
        }
        if (r.signaledActiveRunToStop) {
          return {
            message: 'Plan run stop requested (Ralph process)',
            planId: r.planId,
            severity: 'info' as const,
          };
        }
        return null;
      },
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      payload: (ret) =>
        ret != null &&
        (ret as CancelPlanRunResultObject).planStatusAfter != null
          ? {
              planId: (ret as CancelPlanRunResultObject).planId,
              status: (ret as CancelPlanRunResultObject).planStatusAfter!,
            }
          : null,
    },
  ])
  async cancelPlanRun(
    @Args('input', { type: () => CancelPlanRunInput })
    input: CancelPlanRunInput,
  ): Promise<CancelPlanRunResultObject> {
    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: input.planId } });

    if (!plan) {
      throw new NotFoundException(`🟡 2 - Plan not found: ${input.planId}`);
    }

    const queueResult = await cancelPlanRunJobsForPlan(
      this.plansQueue,
      input.planId,
    );

    const signaledActiveRunToStop = this.planRunCancellation.abort(
      input.planId,
    );

    const out = new CancelPlanRunResultObject();
    out.planId = input.planId;
    out.removedJobIds = [...queueResult.removedJobIds];
    out.activeJobIdsCouldNotCancel = [...queueResult.lockedActiveJobIds];
    out.noMatchingJob = queueResult.matchingJobCount === 0;
    out.planStatusAfter = null;
    out.signaledActiveRunToStop = signaledActiveRunToStop;

    const shouldSetPlanPending =
      queueResult.removedJobIds.length > 0 || signaledActiveRunToStop;

    if (shouldSetPlanPending) {
      await repo.update({ id: input.planId }, { status: 'PENDING' });

      const taskRepo = this.tasksService.getRepository();
      await taskRepo.update(
        { planId: input.planId, status: 'QUEUED' },
        { status: 'PENDING' },
      );

      const refreshed = await repo.findOne({ where: { id: input.planId } });
      out.planStatusAfter = refreshed?.status ?? 'PENDING';
    }

    return out;
  }
}
