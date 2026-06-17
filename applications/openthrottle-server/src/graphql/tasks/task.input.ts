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

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
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
}

@InputType()
export class CreateTasksItemInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
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
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: `Task id to update` })
  id!: string;

  @Field(() => ID, { nullable: true })
  planId!: string | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID. Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `JSON string of requirements array`,
    nullable: true,
  })
  requirements!: string | null;

  @Field(() => Int, {
    description: `Optional. Execution order within plan (gap-based insert, e.g. 1500 between 1000 and 2000).`,
    nullable: true,
  })
  sortOrder!: number | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String, { nullable: true })
  title!: string | null;
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

@InputType()
export class TasksByProjectIdInput {
  /**
   * Optional limit for pagination. When omitted, all tasks are returned.
   */
  @Field(() => Number, {
    description: `Max number of tasks to return. Omit for no limit.`,
    nullable: true,
  })
  limit!: number | null;

  /**
   * Optional offset for pagination. Used with limit; ignored when limit is omitted.
   */
  @Field(() => Number, {
    description: `Number of tasks to skip. Omit or 0 for first page.`,
    nullable: true,
  })
  offset!: number | null;

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
