/**
 * @description GraphQL input types for plan output stream queries and mutations. Replaces multiple @Args with a single input object.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetPlanOutputStreamChunkInput {
  @Field(() => ID, { description: `Chunk id` })
  id!: string;
}

@InputType()
export class ListPlanOutputStreamChunksInput {
  @Field(() => ID, { description: `Plan id to list chunks for` })
  planId!: string;

  @Field(() => Int, {
    description: `Max rows to return (default and hard cap: 1000).`,
    nullable: true,
  })
  limit?: number | null;

  @Field(() => Int, {
    description: `Rows to skip (pagination offset).`,
    nullable: true,
  })
  offset?: number | null;
}

@InputType()
export class AppendPlanOutputInput {
  @Field(() => String, {
    description: `Content of the output chunk`,
  })
  content!: string;

  @Field(() => Int, {
    description: `Optional iteration number for the output chunk`,
    nullable: true,
  })
  iteration!: number | null;

  @Field(() => ID, {
    description: `Plan id to append output to`,
  })
  planId!: string;

  @Field(() => ID, {
    description: `Optional task id to attribute this output chunk to (task-scoped output). Omit for plan-scoped chunks.`,
    nullable: true,
  })
  taskId!: string | null;
}
