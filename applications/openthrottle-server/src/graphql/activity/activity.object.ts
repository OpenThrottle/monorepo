/**
 * @description GraphQL ObjectTypes for activity-by-date-range: commits, output chunks, tasks updated; and lastActivity result.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { TaskObject } from '../tasks/task.object';

@ObjectType()
export class ActivityCommitRowObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  message!: string | null;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  planTitle!: string;

  @Field(() => String)
  repo!: string;

  @Field(() => String)
  sha!: string;

  @Field(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  task!: TaskObject | null;

  @Field(() => String, { nullable: true })
  taskId!: string | null;

  @Field(() => String, { nullable: true })
  taskTitle!: string | null;
}

@ObjectType()
export class ActivityOutputChunkRowObject {
  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => Int, { nullable: true })
  iteration!: number | null;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  planTitle!: string;
}

@ObjectType()
export class ActivityTaskUpdatedRowObject {
  @Field(() => String)
  id!: string;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  planTitle!: string;

  @Field(() => String)
  status!: string;

  @Field(() => TaskObject, {
    description: `Resolved task entity (id is the task id)`,
    nullable: true,
  })
  task!: TaskObject | null;

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class ActivityByDateResultObject {
  @Field(() => [ActivityCommitRowObject])
  commits!: ActivityCommitRowObject[];

  @Field(() => Boolean, {
    description: `True when limit/offset pagination has more items after this page.`,
  })
  hasNext!: boolean;

  @Field(() => [ActivityOutputChunkRowObject])
  outputChunks!: ActivityOutputChunkRowObject[];

  @Field(() => [ActivityTaskUpdatedRowObject])
  tasksUpdated!: ActivityTaskUpdatedRowObject[];

  @Field(() => Int, {
    description: `Total number of activity items in the date range (before pagination).`,
  })
  totalCount!: number;
}

/** Nested type for lastActivity when kind is commit. */
@ObjectType()
export class LastActivityCommitPartObject {
  @Field(() => String, { nullable: true })
  message!: string | null;

  @Field(() => String)
  repo!: string;

  @Field(() => String)
  sha!: string;
}

/** Nested type for lastActivity when kind is output_chunk. */
@ObjectType()
export class LastActivityOutputChunkPartObject {
  @Field(() => String)
  content!: string;

  @Field(() => Int, { nullable: true })
  iteration!: number | null;
}

/** Nested type for lastActivity when kind is task_update. */
@ObjectType()
export class LastActivityTaskUpdatePartObject {
  @Field(() => String)
  status!: string;

  @Field(() => String)
  taskId!: string;

  @Field(() => String)
  taskTitle!: string;
}

/**
 * @description Single most recent activity (commit, plan output chunk, or task update) for a plan or task.
 */
@ObjectType()
export class LastActivityResultObject {
  @Field(() => Date, {
    description: `Timestamp of the activity.`,
  })
  at!: Date;

  @Field(() => String, {
    description: `One of: commit, output_chunk, task_update.`,
  })
  kind!: string;

  @Field(() => String)
  planId!: string;

  @Field(() => String, { nullable: true })
  taskId!: string | null;

  @Field(() => String, {
    description: `Human-readable summary for the answer.`,
  })
  summary!: string;

  @Field(() => LastActivityCommitPartObject, { nullable: true })
  commit!: LastActivityCommitPartObject | null;

  @Field(() => LastActivityOutputChunkPartObject, { nullable: true })
  outputChunk!: LastActivityOutputChunkPartObject | null;

  @Field(() => LastActivityTaskUpdatePartObject, { nullable: true })
  taskUpdate!: LastActivityTaskUpdatePartObject | null;
}
