/**
 * @description Resolver for Task queries and mutations. Injects TasksService from @openthrottle/nestjs-repositories and TasksLoaders for batched plan/project resolution. Maps Task entities to TaskObject.
 */

import { BadRequestException, ConflictException } from '@nestjs/common';
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
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  PLAN_TASK_LIST_ORDER,
  resolveCompletedAtForStatusChange,
  TASK_SORT_ORDER_GAP,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type {
  CreateTaskBatchItem,
  Plan,
  Project,
} from '@openthrottle/nestjs-repositories';
import { Task } from '@openthrottle/nestjs-repositories';
import { In, QueryFailedError } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { PlanObject } from '../plans/plan.object';
import { ProjectObject } from '../projects/project.object';
import {
  AddHookInput,
  CreateTaskInput,
  CreateTasksInput,
  DeleteTaskInput,
  DetachHookInput,
  PromoteTaskToPlanInput,
  ReorderPlanTasksInput,
  RemainingTasksByPlanIdInput,
  TasksByPlanIdInput,
  TasksByProjectIdInput,
  UpdateTaskInput,
} from './task.input';
import {
  CreateTasksResultObject,
  PromoteTaskToPlanResultObject,
  TaskObject,
  TasksByProjectIdResultObject,
} from './task.object';
import { PlanRulesEvaluationService } from '../../queues/plan-rules/plan-rules-evaluation.service';
import { TaggingEnqueueService } from '../../queues/tagging/tagging-enqueue.service';
import { TAGGING_ENTITY_TYPES } from '../../queues/tagging/tagging.types';
import { PLAN_RULES_TRIGGER_KINDS } from '../../queues/plan-rules/plan-rules.types';
import { TaskPromotionEnqueueService } from '../../queues/task-promotion/task-promotion-enqueue.service';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service';
import { TasksLoaders } from './tasks-loaders';

/** Default cap for the unpaginated tasks() list query so it never full-table-scans. */
const DEFAULT_TASKS_LIMIT = 100;
/** Hard ceiling for tasks() even when an explicit limit is supplied. */
const MAX_TASKS_LIMIT = 500;

const SORT_ORDER_UNIQUE_VIOLATION_MESSAGE =
  'A task with this sortOrder already exists for the plan';

const isSortOrderUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
};

/** Type guard for the {@link EmitNotification} payload mappers, whose `ret` is typed `unknown`. */
const isTask = (ret: unknown): ret is Task => ret instanceof Task;

/**
 * Defensively parse the user-supplied requirements JSON string into an array.
 * Returns [] when the input is null/undefined; throws BadRequestException for
 * malformed JSON or non-array payloads so bad input surfaces as a 400, not a 500.
 */
const parseRequirements = (
  requirements: string | null | undefined,
): unknown[] => {
  if (requirements == null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(requirements);
  } catch {
    throw new BadRequestException('Invalid requirements JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestException('requirements JSON must be an array');
  }

  return parsed;
};

/** Narrows the free-text GraphQL role arg to the hook role union, or 400s. */
const parseHookRole = (role: string): 'after' | 'before' => {
  if (role === 'before' || role === 'after') return role;
  throw new BadRequestException("hook role must be 'before' or 'after'");
};

/** Narrows the free-text GraphQL source arg to the hook source union, or 400s. */
const parseHookSource = (source: string): 'skill' | 'template' => {
  if (source === 'skill' || source === 'template') return source;
  throw new BadRequestException("hook source must be 'skill' or 'template'");
};

/** Narrows the optional scope arg to the hook scope union, or 400s. */
const parseHookScope = (
  scope: string | null | undefined,
): 'each' | 'once' | undefined => {
  if (scope == null) return undefined;
  if (scope === 'once' || scope === 'each') return scope;
  throw new BadRequestException("hook scope must be 'once' or 'each'");
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => TaskObject)
export class TasksResolver {
  constructor(
    private readonly loaders: TasksLoaders,
    private readonly notificationsService: NotificationsService,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly taggingEnqueueService: TaggingEnqueueService,
    private readonly taskPromotionEnqueueService: TaskPromotionEnqueueService,
    private readonly tasksService: TasksService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(@Parent() parent: TaskObject): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

  @ResolveField(() => ProjectObject, {
    description: `Resolved project entity when projectId is set`,
    nullable: true,
  })
  async projectRelation(@Parent() parent: TaskObject): Promise<Project | null> {
    if (!parent.projectId) return null;

    return this.loaders.projectLoader.load(parent.projectId);
  }

  @ResolveField(() => String, {
    description: `JSON string of requirements array`,
  })
  requirementsJson(
    @Parent() parent: Task & { requirements?: unknown[] },
  ): string {
    return JSON.stringify(parent.requirements ?? []);
  }

  @ResolveField(() => [TaskObject], {
    description: `Task-level before-hooks anchored to this task (one level), in execution order.`,
  })
  async beforeHooks(@Parent() parent: TaskObject): Promise<Task[]> {
    return (await this.tasksService.getTaskHooks(parent.id)).before;
  }

  @ResolveField(() => [TaskObject], {
    description: `Task-level after-hooks anchored to this task (one level), in execution order.`,
  })
  async afterHooks(@Parent() parent: TaskObject): Promise<Task[]> {
    return (await this.tasksService.getTaskHooks(parent.id)).after;
  }

  @Query(() => TaskObject, {
    description: `Get a task by ID`,
    nullable: true,
  })
  async task(@Args('id', { type: () => ID }) id: string): Promise<Task | null> {
    const entity = await this.tasksService
      .getRepository()
      .findOne({ where: { id } });

    return entity;
  }

  @Query(() => [TaskObject], {
    description: `List tasks, ordered by planId then sortOrder then createdAt ascending. Capped at ${DEFAULT_TASKS_LIMIT} by default (max ${MAX_TASKS_LIMIT}); pass limit to override. Use tasksByPlanId/tasksByProjectId for scoped lists.`,
  })
  async tasks(
    @Args('limit', { nullable: true, type: () => Int })
    limit?: number | null,
  ): Promise<Task[]> {
    const effectiveLimit = Math.min(
      Math.max(1, limit ?? DEFAULT_TASKS_LIMIT),
      MAX_TASKS_LIMIT,
    );
    const entities = await this.tasksService.getRepository().find({
      order: { ...CROSS_PLAN_TASK_LIST_ORDER },
      take: effectiveLimit,
    });

    return entities;
  }

  @Query(() => [TaskObject], {
    description: `List tasks for a plan by plan ID, ordered by sortOrder then createdAt ascending`,
  })
  async tasksByPlanId(
    @Args('input', { type: () => TasksByPlanIdInput })
    input: TasksByPlanIdInput,
  ): Promise<Task[]> {
    const entities = await this.tasksService.getRepository().find({
      order: { ...PLAN_TASK_LIST_ORDER },
      where: { planId: input.planId },
    });

    return entities;
  }

  @Query(() => TasksByProjectIdResultObject, {
    description: `List tasks for a project by project ID (FK). Optional limit/offset for pagination; when omitted returns all tasks and totalCount.`,
  })
  async tasksByProjectId(
    @Args('input', { type: () => TasksByProjectIdInput })
    input: TasksByProjectIdInput,
  ): Promise<TasksByProjectIdResultObject> {
    const repo = this.tasksService.getRepository();
    const where = { projectId: input.projectId };

    const usePagination = input.limit != null && input.limit > 0;
    const take = usePagination ? input.limit : undefined;
    const skip = usePagination ? (input.offset ?? 0) : undefined;

    if (usePagination && take != null) {
      const [entities, totalCount] = await Promise.all([
        repo.find({
          order: { ...CROSS_PLAN_TASK_LIST_ORDER },
          skip,
          take,
          where,
        }),
        repo.count({ where }),
      ]);
      return {
        tasks: entities.map((t): TaskObject => ({
          ...t,
          plan: null,
          projectRelation: null,
          requirementsJson: JSON.stringify(t.requirements ?? []),
        })),
        totalCount,
      };
    }

    const entities = await repo.find({
      order: { ...CROSS_PLAN_TASK_LIST_ORDER },
      where,
    });
    return {
      tasks: entities.map((t): TaskObject => ({
        ...t,
        plan: null,
        projectRelation: null,
        requirementsJson: JSON.stringify(t.requirements ?? []),
      })),
      totalCount: entities.length,
    };
  }

  @Query(() => [TaskObject], {
    description: `List remaining tasks for a plan (status in PENDING, IN_PROGRESS, BLOCKED), ordered by sortOrder then createdAt ascending`,
  })
  async remainingTasksByPlanId(
    @Args('input', { type: () => RemainingTasksByPlanIdInput })
    input: RemainingTasksByPlanIdInput,
  ): Promise<Task[]> {
    const entities = await this.tasksService.getRepository().find({
      order: { ...PLAN_TASK_LIST_ORDER },
      where: {
        planId: input.planId,
        status: In(['PENDING', 'IN_PROGRESS', 'BLOCKED']),
      },
    });

    return entities;
  }

  @Mutation(() => TaskObject, {
    description: `Create a task`,
  })
  @EmitNotification(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, (ret) =>
    isTask(ret) && ret.planId != null
      ? {
          message: `Task created: ${ret.title}`,
          planId: ret.planId,
          severity: 'info' as const,
          taskId: ret.id,
        }
      : null,
  )
  async createTask(
    @Args('input', { type: () => CreateTaskInput }) input: CreateTaskInput,
  ): Promise<Task> {
    const repo = this.tasksService.getRepository();
    const requirementsArr = parseRequirements(input.requirements);

    const sortOrder =
      input.sortOrder != null
        ? input.sortOrder
        : await this.tasksService.resolveNextSortOrder(input.planId);

    const status = (input.status ?? 'PENDING').toUpperCase();
    const entity = repo.create({
      assignee: input.assignee ?? null,
      category: input.category ?? null,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      description: input.description ?? null,
      planId: input.planId,
      project: input.project ?? null,
      projectId: input.projectId ?? null,
      requirements: requirementsArr,
      sortOrder,
      status,
      summary: input.summary ?? null,
      title: input.title,
    });

    let saved: Task;
    try {
      saved = await repo.save(entity);
    } catch (error) {
      if (isSortOrderUniqueViolation(error)) {
        throw new ConflictException(SORT_ORDER_UNIQUE_VIOLATION_MESSAGE);
      }
      throw error;
    }

    if (saved.status === 'IN_PROGRESS') {
      const promoted = await this.tasksService.syncParentPlanStatus(
        saved.planId,
      );
      if (promoted) {
        this.notificationsService.emitPlanStatusChanged({
          planId: saved.planId,
          status: 'IN_PROGRESS',
        });
      }
    }

    await this.planRulesEvaluationService.enqueueEvaluation(
      saved.planId,
      PLAN_RULES_TRIGGER_KINDS.TASK_CREATED,
    );
    await this.taggingEnqueueService.enqueuePredict(
      TAGGING_ENTITY_TYPES.TASK,
      saved.id,
    );

    return saved;
  }

  @Mutation(() => CreateTasksResultObject, {
    description: `Create many tasks for one plan atomically in a single transaction. Omitted sortOrders append MAX+1000 stepping in array order; explicit per-item sortOrder is respected. Any failure rolls back the whole batch.`,
  })
  async createTasks(
    @Args('input', { type: () => CreateTasksInput }) input: CreateTasksInput,
  ): Promise<CreateTasksResultObject> {
    const items: CreateTaskBatchItem[] = input.tasks.map((item) => ({
      assignee: item.assignee ?? null,
      category: item.category ?? null,
      description: item.description ?? null,
      project: item.project ?? null,
      projectId: item.projectId ?? null,
      requirements: parseRequirements(item.requirements),
      sortOrder: item.sortOrder ?? null,
      status: (item.status ?? 'PENDING').toUpperCase(),
      summary: item.summary ?? null,
      title: item.title,
    }));

    let saved: Task[];
    try {
      saved = await this.tasksService.createTasksBatch(input.planId, items);
    } catch (error) {
      if (isSortOrderUniqueViolation(error)) {
        throw new ConflictException(SORT_ORDER_UNIQUE_VIOLATION_MESSAGE);
      }
      throw error;
    }

    if (saved.some((task) => task.status === 'IN_PROGRESS')) {
      const promoted = await this.tasksService.syncParentPlanStatus(
        input.planId,
      );
      if (promoted) {
        this.notificationsService.emitPlanStatusChanged({
          planId: input.planId,
          status: 'IN_PROGRESS',
        });
      }
    }

    await this.planRulesEvaluationService.enqueueEvaluation(
      input.planId,
      PLAN_RULES_TRIGGER_KINDS.TASK_CREATED,
    );
    await Promise.all(
      saved.map((task) =>
        this.taggingEnqueueService.enqueuePredict(
          TAGGING_ENTITY_TYPES.TASK,
          task.id,
        ),
      ),
    );

    return {
      tasks: saved.map((task): TaskObject => ({
        ...task,
        plan: null,
        projectRelation: null,
        requirementsJson: JSON.stringify(task.requirements ?? []),
      })),
      totalCount: saved.length,
    };
  }

  @Mutation(() => TaskObject, {
    description: `Update a task`,
    nullable: true,
  })
  @EmitNotification([
    {
      event: NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
      payload: (ret) => {
        if (!isTask(ret) || ret.planId == null) return null;

        return {
          message:
            ret.status === 'COMPLETED'
              ? `Task completed: ${ret.title}`
              : `Task updated: ${ret.title}`,
          planId: ret.planId,
          severity: ret.status === 'COMPLETED' ? 'success' : 'info',
          taskId: ret.id,
        };
      },
    },
    {
      event: NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      payload: (ret) =>
        isTask(ret) && ret.planId != null
          ? {
              planId: ret.planId,
              status: ret.status,
              taskId: ret.id,
            }
          : null,
    },
  ])
  async updateTask(
    @Args('input', { type: () => UpdateTaskInput }) input: UpdateTaskInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<Task | null> {
    const repo = this.tasksService.getRepository();
    const entity = await repo.findOne({ where: { id: input.id } });

    if (!entity) return null;

    const previousStatus = entity.status.toUpperCase();

    if (input.planId != null) entity.planId = input.planId;
    if (input.requirements != null) {
      entity.requirements = parseRequirements(input.requirements);
    }
    if (input.status != null) {
      const nextStatus = input.status.toUpperCase();
      entity.completedAt = resolveCompletedAtForStatusChange({
        currentCompletedAt: entity.completedAt,
        nextStatus,
        previousStatus,
      });
      entity.status = nextStatus;
    }
    if (input.title != null) entity.title = input.title;

    if (input.assignee !== undefined) entity.assignee = input.assignee;
    if (input.category !== undefined) entity.category = input.category;
    if (input.description !== undefined) entity.description = input.description;
    if (input.project !== undefined) entity.project = input.project;
    if (input.projectId !== undefined) entity.projectId = input.projectId;
    if (input.summary !== undefined) entity.summary = input.summary;
    if (input.sortOrder !== undefined && input.sortOrder !== null) {
      entity.sortOrder = input.sortOrder;
    }

    // A real status transition (not a no-op re-assert). The status_change ledger fact and the
    // row's completed_at must commit together (G12) — so save + capture run in one transaction.
    const statusChanged =
      input.status != null && entity.status !== previousStatus;

    let saved: Task;
    try {
      saved = await repo.manager.transaction(async (manager) => {
        const persisted = await manager.save(entity);

        if (statusChanged) {
          await this.workLedgerCapture.recordStatusChange(manager, {
            actorKind,
            actorSub,
            entity: 'task',
            from: previousStatus,
            id: persisted.id,
            planId: persisted.planId,
            taskId: persisted.id,
            to: persisted.status,
          });
        }

        return persisted;
      });
    } catch (error) {
      if (isSortOrderUniqueViolation(error)) {
        throw new ConflictException(SORT_ORDER_UNIQUE_VIOLATION_MESSAGE);
      }
      throw error;
    }

    if (saved.status === 'IN_PROGRESS' && previousStatus !== 'IN_PROGRESS') {
      const promoted = await this.tasksService.syncParentPlanStatus(
        saved.planId,
      );
      if (promoted) {
        this.notificationsService.emitPlanStatusChanged({
          planId: saved.planId,
          status: 'IN_PROGRESS',
        });
      }
    }

    // Downward reconcile: completing the last task closes out the plan. Without this the plan can be
    // stranded IN_PROGRESS with every task COMPLETED (the orchestrator only completes plans at its
    // top-of-loop check, which several exit paths skip). See TasksService.completeParentPlanIfTasksDone.
    if (saved.status === 'COMPLETED' && previousStatus !== 'COMPLETED') {
      const completed = await this.tasksService.completeParentPlanIfTasksDone(
        saved.planId,
      );
      if (completed) {
        this.notificationsService.emitPlanStatusChanged({
          planId: saved.planId,
          status: 'COMPLETED',
        });
      }
    }

    if (input.status != null && saved.status !== previousStatus) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        saved.planId,
        PLAN_RULES_TRIGGER_KINDS.STATUS_CHANGED,
      );
    }

    return saved;
  }

  @Mutation(() => [TaskObject], {
    description: `Reorder tasks within a plan. Renumbers sortOrder 1000, 2000, … in taskIds order atomically.`,
  })
  async reorderPlanTasks(
    @Args('input', { type: () => ReorderPlanTasksInput })
    input: ReorderPlanTasksInput,
  ): Promise<Task[]> {
    const repo = this.tasksService.getRepository();
    const { planId, taskIds } = input;

    if (taskIds.length === 0) {
      return [];
    }

    const uniqueTaskIds = [...new Set(taskIds)];

    if (uniqueTaskIds.length !== taskIds.length) {
      throw new BadRequestException('taskIds must not contain duplicates');
    }

    const tasks = await repo.find({
      where: { id: In(taskIds), planId },
    });

    if (tasks.length !== taskIds.length) {
      throw new BadRequestException(
        'One or more taskIds do not belong to the plan',
      );
    }

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const orderedTasks = taskIds.map((id) => taskById.get(id)!);
    const temporarySortOrderBase = 1_000_000;

    return repo.manager.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      await Promise.all(
        orderedTasks.map((task, index) =>
          taskRepo.update(task.id, {
            sortOrder: temporarySortOrderBase + index,
          }),
        ),
      );

      const results: Task[] = [];

      await Promise.all(
        orderedTasks.map(async (task, index) => {
          const sortOrder = (index + 1) * TASK_SORT_ORDER_GAP;
          await taskRepo.update(task.id, { sortOrder });
          results[index] = { ...task, sortOrder };
        }),
      );

      return results;
    });
  }

  @Mutation(() => Boolean, {
    description: `Delete a task by ID`,
  })
  async deleteTask(
    @Args('input', { type: () => DeleteTaskInput }) input: DeleteTaskInput,
  ): Promise<boolean> {
    const repo = this.tasksService.getRepository();
    const result = await repo.delete({ id: input.id });

    return (result.affected ?? 0) > 0;
  }

  @Mutation(() => TaskObject, {
    description: `Attach a lifecycle hook to a plan (anchorTaskId omitted → beforeAll/afterAll, or beforeEach/afterEach with scope 'each') or to a task (anchorTaskId set → per-task before/after). The hook is materialized as a task row carrying hook_role/scope/source.`,
  })
  async addHook(
    @Args('input', { type: () => AddHookInput }) input: AddHookInput,
  ): Promise<Task> {
    const role = parseHookRole(input.role);
    const source = parseHookSource(input.source);
    const scope = parseHookScope(input.scope);
    const anchorTaskId = input.anchorTaskId ?? null;

    const attach =
      role === 'before'
        ? this.tasksService.addBeforeHook.bind(this.tasksService)
        : this.tasksService.addAfterHook.bind(this.tasksService);

    try {
      return await attach(input.planId, anchorTaskId, {
        description: input.description ?? null,
        scope,
        skillSlug: input.skillSlug ?? null,
        source,
        title: input.title ?? null,
      });
    } catch (error) {
      if (isSortOrderUniqueViolation(error)) {
        throw new ConflictException(SORT_ORDER_UNIQUE_VIOLATION_MESSAGE);
      }
      // Service-layer invariant violations (skillSlug, scope, one-level nesting,
      // unknown anchor) are client-input errors → surface as 400, not 500.
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description: `Detach (delete) a lifecycle hook task by id. Only rows that are hooks (hook_role set) are removable this way.`,
  })
  async detachHook(
    @Args('input', { type: () => DetachHookInput }) input: DetachHookInput,
  ): Promise<boolean> {
    return this.tasksService.detachHook(input.hookTaskId);
  }

  @Mutation(() => PromoteTaskToPlanResultObject, {
    description: `Promote a task into a new, first-class plan. Validates the task is promotable (exists, not a lifecycle hook, not already promoted) then enqueues an async task-promotion job (enqueue-after-validate, idempotency key doubles as the BullMQ job id). The job creates the plan, carries the task's tags, seeds an initial task, closes out the source task (→ SKIPPED + \`promoted\` tag), and records provenance. Returns the accepted job id; the new plan surfaces via the task-status subscription once the job completes.`,
  })
  async promoteTaskToPlan(
    @Args('input', { type: () => PromoteTaskToPlanInput })
    input: PromoteTaskToPlanInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PromoteTaskToPlanResultObject> {
    const isUser = actorKind === 'user' && actorSub != null;
    const isServiceAccount =
      actorKind === 'service_account' && actorSub != null;

    const result = await this.taskPromotionEnqueueService.enqueuePromotion({
      actorServiceAccountId: isServiceAccount ? actorSub : null,
      actorUserId: isUser ? actorSub : null,
      idempotencyKey: input.idempotencyKey ?? null,
      taskId: input.taskId,
    });

    const out = new PromoteTaskToPlanResultObject();
    if ('jobId' in result) {
      out.success = true;
      out.jobId = result.jobId;
      out.error = null;
    } else {
      out.success = false;
      out.jobId = null;
      out.error = result.error;
    }
    return out;
  }
}
