/**
 * @description GraphQL ObjectType for Plan. Implements {@link PlanData} from @openthrottle/nestjs-repositories so the API shape stays in sync with the entity.
 */

import type { PlanData } from '@openthrottle/nestjs-repositories/src/modules/plans/plan.entity';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ProjectObject } from '../projects/project.object';

@ObjectType()
export class PlanObject implements PlanData {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => String, {
    description: `Optional. Project UUID (FK to projects table). Null when plan is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ProjectObject, {
    description: `Resolved project entity when projectId is set; null when projectId is unset.`,
    nullable: true,
  })
  projectRelation!: ProjectObject | null;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => Int, {
    description:
      'Number of tasks belonging to this plan. Resolved from tasks table.',
  })
  taskCount?: number;

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

/** Plan count per status for sidebar/filters. */
@ObjectType()
export class PlanStatusCountObject {
  @Field(() => Int)
  count!: number;

  @Field(() => String)
  status!: string;
}

/** Result of listPlansByStatus: plans and total count. */
@ObjectType()
export class ListPlansByStatusResultObject {
  @Field(() => [PlanObject])
  plans!: PlanObject[];

  @Field(() => Int)
  totalCount!: number;
}

/** Result of enqueuePlanRun: job id, plan id, and queue position for UI feedback. */
@ObjectType()
export class EnqueuePlanRunResultObject {
  @Field(() => String, { description: 'BullMQ job id' })
  jobId!: string;

  @Field(() => String, { description: 'Plan id that was enqueued' })
  planId!: string;

  @Field(() => Int, {
    description:
      'Position of this job in the waiting queue (1-based). E.g., 1 means next to be processed.',
  })
  queuePosition!: number;

  @Field(() => Int, {
    description:
      'Total number of jobs waiting in the queue (including this one).',
  })
  queueTotal!: number;
}
