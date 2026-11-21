/**
 * @description GraphQL input types for task mutations and multi-arg queries. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateTaskInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: `Plan id the task belongs to` })
  planId!: string;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects. Set the plan's projectId instead.`,
    nullable: true,
  })
  project!: string | null;

  @Field(() => ID, {
    deprecationReason: `A task's project is its plan's project; set projectId on the plan.`,
    description: `Project UUID (FK to projects table). Omit or pass null when task is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `JSON string of requirements array`,
    nullable: true,
  })
  requirements!: string | null;

  @Field(() => Int, {
    description: `Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000.`,
    nullable: true,
  })
  sortOrder!: number | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => Int, {
    description: `Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet.`,
    nullable: true,
  })
  wave!: number | null;
}

@InputType()
export class CreateTasksItemInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects. Set the plan's projectId instead.`,
    nullable: true,
  })
  project!: string | null;

  @Field(() => ID, {
    deprecationReason: `A task's project is its plan's project; set projectId on the plan.`,
    description: `Project UUID (FK to projects table). Omit or pass null when task is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `JSON string of requirements array`,
    nullable: true,
  })
  requirements!: string | null;

  @Field(() => Int, {
    description: `Optional. Execution order within plan. When omitted, server auto-assigns MAX+1000 stepping in array order.`,
    nullable: true,
  })
  sortOrder!: number | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => Int, {
    description: `Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; NULL (omitted) means unassigned and runs sequentially in sortOrder position. Not consumed for execution yet.`,
    nullable: true,
  })
  wave!: number | null;
}

@InputType()
export class CreateTasksInput {
  @Field(() => ID, { description: `Plan id all tasks in this batch belong to` })
  planId!: string;

  @Field(() => [CreateTasksItemInput], {
    description: `Tasks to create atomically in one transaction. sortOrder is per-item optional; omitted items append MAX+1000, MAX+2000, … in array order.`,
  })
  tasks!: CreateTasksItemInput[];
}

@InputType()
export class UpdateTaskInput {
  @Field(() => String, { nullable: true })
  assignee?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID, { description: `Task id to update` })
  id!: string;

  @Field(() => ID, { nullable: true })
  planId?: string | null;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects. Set the plan's projectId instead.`,
    nullable: true,
  })
  project?: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID. Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId?: string | null;

  @Field(() => String, {
    description: `JSON string of requirements array`,
    nullable: true,
  })
  requirements?: string | null;

  @Field(() => Int, {
    description: `Optional. Execution order within plan (gap-based insert, e.g. 1500 between 1000 and 2000).`,
    nullable: true,
  })
  sortOrder?: number | null;

  @Field(() => String, { nullable: true })
  status?: string | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => Int, {
    description: `Optional. Coarse concurrency layer within the plan: tasks sharing a wave may be worked concurrently. Never 0; pass null to clear (unassigned); omit to leave unchanged. Not consumed for execution yet.`,
    nullable: true,
  })
  wave?: number | null;
}

@InputType()
export class ReorderPlanTasksInput {
  @Field(() => ID, {
    description: `Plan id whose tasks are being reordered`,
  })
  planId!: string;

  @Field(() => [ID], {
    description: `Task ids in desired order; sortOrder is reassigned 1000, 2000, … atomically`,
  })
  taskIds!: string[];
}

@InputType()
export class TasksByPlanIdInput {
  @Field(() => ID, { description: `Plan id to list tasks for` })
  planId!: string;
}

/**
 * @description Does not extend `OffsetPaginationInput` from `@openthrottle/nestjs-graphql`: this input shipped `limit` and
 * `offset` as `Float`, and narrowing an input field to `Int` breaks any client whose
 * variables are typed `Float`. Same validation (`assertPagination`), legacy wire type.
 */
@InputType()
export class TasksByProjectIdInput {
  @Field(() => Number, {
    description: `Page size. Omitted means the list's default; out of range is rejected`,
    nullable: true,
  })
  limit?: number | null;

  @Field(() => Number, {
    description: `Rows to skip, 0 or more. Omitted means 0`,
    nullable: true,
  })
  offset?: number | null;

  @Field(() => ID, { description: `Project id (FK) to list tasks for` })
  projectId!: string;
}

@InputType()
export class RemainingTasksByPlanIdInput {
  @Field(() => ID, {
    description: `Plan id; returns tasks with status in PENDING, IN_PROGRESS, BLOCKED`,
  })
  planId!: string;
}

@InputType()
export class DeleteTaskInput {
  @Field(() => ID, { description: `Task id to delete` })
  id!: string;
}

@InputType()
export class AddHookInput {
  @Field(() => ID, {
    description: `Anchor task the hook attaches to (task-level before/after). Omit or null for a plan-level hook (beforeAll/afterAll, or beforeEach/afterEach with scope 'each').`,
    nullable: true,
  })
  anchorTaskId?: string | null;

  @Field(() => String, {
    description: `Optional hook task description (template source).`,
    nullable: true,
  })
  description?: string | null;

  @Field(() => ID, { description: `Plan the hook belongs to` })
  planId!: string;

  @Field(() => String, {
    description: `Hook role: 'before' or 'after'.`,
  })
  role!: string;

  @Field(() => String, {
    description: `Plan-level only: 'once' (beforeAll/afterAll) or 'each' (beforeEach/afterEach, expanded onto every task). Defaults to 'once'. Rejected for task-level hooks.`,
    nullable: true,
  })
  scope?: string | null;

  @Field(() => String, {
    description: `Skill slug when source is 'skill'; required in that case.`,
    nullable: true,
  })
  skillSlug?: string | null;

  @Field(() => String, {
    description: `Hook body source: 'template' (inline title/description) or 'skill' (runs skillSlug via the hooks runner).`,
  })
  source!: string;

  @Field(() => String, {
    description: `Optional hook task title (template source). Defaults to a generated label.`,
    nullable: true,
  })
  title?: string | null;
}

@InputType()
export class DetachHookInput {
  @Field(() => ID, { description: `Hook task id to detach (delete)` })
  hookTaskId!: string;
}

@InputType()
export class PromoteTaskToPlanInput {
  @Field(() => ID, { description: `Id of the task to promote into a new plan` })
  taskId!: string;

  @Field(() => String, {
    description: `Optional idempotency key: re-submitting the same key enqueues at most one promotion job. Letters, digits, and ._:- only.`,
    nullable: true,
  })
  idempotencyKey?: string | null;
}
