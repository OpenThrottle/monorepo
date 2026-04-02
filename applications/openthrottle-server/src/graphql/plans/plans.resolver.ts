/**
 * @description Resolver for Plan queries and mutations. Injects PlansService from @openthrottle/nestjs-repositories and maps Plan entities to PlanObject.
 */

import {
  getCortexPostgresConfig,
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
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import {
  PlansService,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { In } from 'typeorm';
import type { Project } from '@openthrottle/nestjs-repositories';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  PLAN_JOB_PRIORITY_DEFAULT,
  PLANS_QUEUE_NAME,
} from '../../queues/plans/plans.constants';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { ProjectObject } from '../projects/project.object';
import { cancelPlanRunJobsForPlan } from './cancel-plan-run-jobs';
import { buildRunPlanJobData } from './enqueue-plan-ralph-tuning';
import {
  CancelPlanRunInput,
  CreatePlanInput,
  DeletePlanInput,
  EnqueuePlanRunInput,
  ListPlansByStatusInput,
  SearchPlansInput,
  SetPlanStatusInput,
  UpdatePlanInput,
} from './plan.input';
import {
  CancelPlanRunResultObject,
  EnqueuePlanRunResultObject,
  ListPlansByStatusResultObject,
  PlanObject,
  PlanStatusCountObject,
} from './plan.object';

const DEFAULT_SEARCH_PLANS_LIMIT = 20;

@Resolver(() => PlanObject)
export class PlansResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly plansService: PlansService,
    private readonly projectsService: ProjectsService,
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

  // @ProfileResponseTime('PlansResolver.taskCount')
  @ResolveField(() => Int, {
    description: 'Number of tasks belonging to this plan',
  })
  async taskCount(@Parent() parent: PlanObject): Promise<number> {
    return this.tasksService
      .getRepository()
      .count({ where: { planId: parent.id } });
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
    const config = getCortexPostgresConfig();

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
    )) as { status: string; count: number }[];

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
    const repo = this.plansService.getRepository();
    const entity = repo.create({
      assignee: input.assignee ?? null,
      author: input.author,
      category: input.category,
      description: input.description ?? null,
      project: input.project ?? null,
      projectId: input.projectId ?? null,
      status: (input.status ?? 'PENDING').toUpperCase(),
      summary: input.summary ?? null,
      title: input.title,
    });

    const saved = await repo.save(entity);

    return saved;
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

    // The fields are not nullable, so we need to check for null.
    if (input.author != null) entity.author = input.author;
    if (input.category != null) entity.category = input.category;
    if (input.status != null) entity.status = input.status.toUpperCase();
    if (input.title != null) entity.title = input.title;

    // These fields are nullable, so we need to check for undefined.
    if (input.assignee !== undefined) entity.assignee = input.assignee;
    if (input.description !== undefined) entity.description = input.description;
    if (input.project !== undefined) entity.project = input.project;
    if (input.projectId !== undefined) entity.projectId = input.projectId;
    if (input.summary !== undefined) entity.summary = input.summary;

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

    entity.status = input.status.trim().toUpperCase();

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

  // @ProfileResponseTime('PlansResolver.enqueuePlanRun')
  @Mutation(() => EnqueuePlanRunResultObject, {
    description: `Enqueue a plan-run job for the given plan. Used by Cortex UI "Run plan" action. Returns job id, plan id, and queue position.`,
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
    const { planId, priority, ralph } = input;

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });

    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    let jobData: RunPlanJobData;
    try {
      jobData = buildRunPlanJobData({ planId, ralph });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }

    const jobPriority = priority ?? PLAN_JOB_PRIORITY_DEFAULT;
    const job = await this.plansQueue.add('run-plan', jobData, {
      priority: jobPriority,
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
    result.jobId = String(job.id ?? job.name);
    result.planId = planId;
    result.queuePosition = queuePosition;
    result.queueTotal = queueTotal;

    return result;
  }

  // @ProfileResponseTime('PlansResolver.cancelPlanRun')
  @Mutation(() => CancelPlanRunResultObject, {
    description: `Cancel queued or delayed BullMQ plan-run jobs for a plan (stops Ralph when the job has not started yet). Active jobs are reported in activeJobIdsCouldNotCancel because BullMQ cannot remove locked jobs from outside the worker.`,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payload: (ret) =>
        ret != null &&
        (ret as CancelPlanRunResultObject).removedJobIds.length > 0
          ? {
              message: 'Plan run cancelled (removed from queue)',
              planId: (ret as CancelPlanRunResultObject).planId,
              severity: 'info' as const,
            }
          : null,
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
      throw new NotFoundException(`Plan not found: ${input.planId}`);
    }

    const queueResult = await cancelPlanRunJobsForPlan(
      this.plansQueue,
      input.planId,
    );

    const out = new CancelPlanRunResultObject();
    out.planId = input.planId;
    out.removedJobIds = [...queueResult.removedJobIds];
    out.activeJobIdsCouldNotCancel = [...queueResult.lockedActiveJobIds];
    out.noMatchingJob = queueResult.matchingJobCount === 0;
    out.planStatusAfter = null;

    if (queueResult.removedJobIds.length > 0) {
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
