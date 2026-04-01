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
}

@InputType()
export class AppendPlanOutputInput {
  @Field(() => String, { description: `Content of the output chunk` })
  content!: string;

  @Field(() => Int, {
    description: `Optional iteration number for the output chunk`,
    nullable: true,
  })
  iteration!: number | null;

  @Field(() => ID, { description: `Plan id to append output to` })
  planId!: string;
}
