/**
 * @description Resolver for Task queries and mutations. Injects TasksService from @openthrottle/nestjs-repositories and TasksLoaders for batched plan/project resolution. Maps Task entities to TaskObject.
 */

import { ConflictException, NotImplementedException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  PLAN_TASK_LIST_ORDER,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { Plan, Project, Task } from '@openthrottle/nestjs-repositories';
import { In, QueryFailedError } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { PlanObject } from '../plans/plan.object';
import { ProjectObject } from '../projects/project.object';
import {
  CreateTaskInput,
  DeleteTaskInput,
  ReorderPlanTasksInput,
  RemainingTasksByPlanIdInput,
  TasksByPlanIdInput,
  TasksByProjectIdInput,
  UpdateTaskInput,
} from './task.input';
import { TaskObject, TasksByProjectIdResultObject } from './task.object';
import { TasksLoaders } from './tasks-loaders';

const SORT_ORDER_UNIQUE_VIOLATION_MESSAGE =
  'A task with this sortOrder already exists for the plan';

const isSortOrderUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
};

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
    description: `List all tasks, ordered by createdAt ascending`,
  })
  async tasks(): Promise<Task[]> {
    const entities = await this.tasksService.getRepository().find({
      order: { createdAt: 'ASC' },
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
          order: { createdAt: 'ASC' },
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
      order: { createdAt: 'ASC' },
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

    return saved;
  }

  @Mutation(() => [TaskObject], {
    description: `Reorder tasks within a plan. Renumbers sortOrder 1000, 2000, … in taskIds order atomically.`,
  })
  reorderPlanTasks(
    @Args('input', { type: () => ReorderPlanTasksInput })
    _input: ReorderPlanTasksInput,
  ): Promise<Task[]> {
    throw new NotImplementedException(
      'reorderPlanTasks is not implemented yet; see plan task reorderPlanTasks GraphQL mutation.',
    );
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
