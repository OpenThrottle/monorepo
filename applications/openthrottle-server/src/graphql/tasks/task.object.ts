/**
 * @description GraphQL ObjectType for Task. Mirrors {@link TaskData} from @openthrottle/nestjs-repositories; requirements are exposed as a JSON string.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { ProjectObject } from '../projects/project.object';

@ObjectType()
export class TaskObject {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => Date, {
    description: `Set once on transition into COMPLETED; cleared if status leaves COMPLETED. Null when never completed.`,
    nullable: true,
  })
  completedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, {
    description: `Lifecycle-hook role: 'before' or 'after'. NULL for a regular (non-hook) task.`,
    nullable: true,
  })
  hookRole!: string | null;

  @Field(() => String, {
    description: `Plan-level hook scope: 'once' (beforeAll/afterAll) or 'each' (beforeEach/afterEach). NULL for regular tasks and task-level hooks.`,
    nullable: true,
  })
  hookScope!: string | null;

  @Field(() => String, {
    description: `Hook body source: 'template' (inline title/description) or 'skill' (runs skillSlug via the hooks runner). NULL for regular tasks.`,
    nullable: true,
  })
  hookSource!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Parent task this hook is anchored to (task-level before/after). NULL for regular tasks and plan-level hooks.`,
    nullable: true,
  })
  parentTaskId!: string | null;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => String, {
    description: `Project UUID (FK to projects table)`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ProjectObject, {
    description: `Resolved project entity when projectId is set`,
    nullable: true,
  })
  projectRelation!: ProjectObject | null;

  @Field(() => String, {
    defaultValue: '[]',
    description: `JSON string of requirements array`,
  })
  requirementsJson!: string;

  @Field(() => String, {
    description: `Skill slug when hookSource is 'skill'; NULL otherwise.`,
    nullable: true,
  })
  skillSlug!: string | null;

  @Field(() => Int, {
    description: `Execution/list order within plan (gap-based: 1000, 2000, …). UNIQUE per planId.`,
  })
  sortOrder!: number;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

/** Result of tasksByProjectId: tasks slice and total count for pagination. */
@ObjectType()
export class TasksByProjectIdResultObject {
  @Field(() => [TaskObject])
  tasks!: TaskObject[];

  @Field(() => Int)
  totalCount!: number;
}

/** Result of createTasks: the tasks created in the batch and how many. */
@ObjectType()
export class CreateTasksResultObject {
  @Field(() => [TaskObject])
  tasks!: TaskObject[];

  @Field(() => Int)
  totalCount!: number;
}

/**
 * Result of promoteTaskToPlan: the promotion runs asynchronously in the
 * task-promotion queue, so success returns the accepted job id (not the new
 * plan). The new plan surfaces via the task-status subscription + linked
 * artifacts once the job completes.
 */
@ObjectType()
export class PromoteTaskToPlanResultObject {
  @Field(() => Boolean, {
    description: 'Whether the promotion job was accepted and enqueued.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'BullMQ job id when success is true.',
    nullable: true,
  })
  jobId!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false (validation/enqueue).',
    nullable: true,
  })
  error!: string | null;
}
