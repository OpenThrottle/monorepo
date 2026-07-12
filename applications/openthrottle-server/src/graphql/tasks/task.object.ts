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

  @Field(() => String)
  id!: string;

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
