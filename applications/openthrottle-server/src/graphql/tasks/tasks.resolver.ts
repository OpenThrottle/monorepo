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
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  PLAN_TASK_LIST_ORDER,
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
  CreateTaskInput,
  CreateTasksInput,
  DeleteTaskInput,
  ReorderPlanTasksInput,
  RemainingTasksByPlanIdInput,
  TasksByPlanIdInput,
  TasksByProjectIdInput,
  UpdateTaskInput,
} from './task.input';
import {
  CreateTasksResultObject,
  TaskObject,
  TasksByProjectIdResultObject,
} from './task.object';
import { TasksLoaders } from './tasks-loaders';

/** Default cap for the unpaginated tasks() list query so it never full-table-scans. */
const DEFAULT_TASKS_LIMIT = 100;
/** Hard ceiling for tasks() even when an explicit limit is supplied. */
const MAX_TASKS_LIMIT = 500;

const SORT_ORDER_UNIQUE_VIOLATION_MESSAGE =
  'A task with this sortOrder already exists for the plan';

const isSortOrderUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => TaskObject)
export class TasksResolver {
  constructor(
    private readonly loaders: TasksLoaders,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
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
        tasks: entities.map((t) => ({
          ...t,
          requirementsJson: JSON.stringify(t.requirements ?? []),
        })) as TaskObject[],
        totalCount,
      };
    }

    const entities = await repo.find({
      order: { ...CROSS_PLAN_TASK_LIST_ORDER },
      where,
    });
    return {
      tasks: entities.map((t) => ({
        ...t,
        requirementsJson: JSON.stringify(t.requirements ?? []),
      })) as TaskObject[],
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
    ret != null && (ret as Task).planId != null
      ? {
          message: `Task created: ${(ret as Task).title}`,
          planId: (ret as Task).planId as string,
          severity: 'info' as const,
          taskId: (ret as Task).id,
        }
      : null,
  )
  async createTask(
    @Args('input', { type: () => CreateTaskInput }) input: CreateTaskInput,
  ): Promise<Task> {
    const repo = this.tasksService.getRepository();
    const requirementsArr = input.requirements
      ? (JSON.parse(input.requirements) as unknown[])
      : [];

    const sortOrder =
      input.sortOrder != null
        ? input.sortOrder
        : await this.tasksService.resolveNextSortOrder(input.planId);

    const entity = repo.create({
      assignee: input.assignee ?? null,
      category: input.category ?? null,
      description: input.description ?? null,
      planId: input.planId,
      project: input.project ?? null,
      projectId: input.projectId ?? null,
      requirements: requirementsArr,
      sortOrder,
      status: (input.status ?? 'PENDING').toUpperCase(),
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
      requirements: item.requirements
        ? (JSON.parse(item.requirements) as unknown[])
        : [],
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

    return {
      tasks: saved.map((task) => ({
        ...task,
        requirementsJson: JSON.stringify(task.requirements ?? []),
      })) as TaskObject[],
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
        if (ret == null || (ret as Task).planId == null) return null;
        const t = ret as Task;

        return {
          message:
            t.status === 'COMPLETED'
              ? `Task completed: ${t.title}`
              : `Task updated: ${t.title}`,
          planId: t.planId as string,
          severity: (t.status === 'COMPLETED' ? 'success' : 'info') as
            | 'success'
            | 'info',
          taskId: t.id,
        };
      },
    },
    {
      event: NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      payload: (ret) =>
        ret != null && (ret as Task).planId != null
          ? {
              planId: (ret as Task).planId as string,
              status: (ret as Task).status,
              taskId: (ret as Task).id,
            }
          : null,
    },
  ])
  async updateTask(
    @Args('input', { type: () => UpdateTaskInput }) input: UpdateTaskInput,
  ): Promise<Task | null> {
    const repo = this.tasksService.getRepository();
    const entity = await repo.findOne({ where: { id: input.id } });

    if (!entity) return null;

    const previousStatus = entity.status.toUpperCase();

    if (input.planId != null) entity.planId = input.planId;
    if (input.requirements != null) {
      entity.requirements = JSON.parse(input.requirements) as unknown[];
    }
    if (input.status != null) entity.status = input.status.toUpperCase();
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

    let saved: Task;
    try {
      saved = await repo.save(entity);
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
}
