/**
 * @description GraphQL ObjectType for PlanOutputStreamChunk. Mirrors the plan_output_stream entity from @openthrottle/nestjs-repositories.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';

@ObjectType()
export class PlanOutputStreamChunkObject {
  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => Int, {
    description: 'Optional iteration number for the output chunk',
    nullable: true,
  })
  iteration!: number | null;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String, {
    description:
      'Task this chunk is attributed to (task-scoped output); null for plan-scoped chunks and historical rows.',
    nullable: true,
  })
  taskId!: string | null;
}
