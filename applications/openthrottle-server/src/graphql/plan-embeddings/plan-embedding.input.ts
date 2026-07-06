/**
 * @description GraphQL input types for plan-embedding queries. Single input argument per operation for consistency with other resolvers.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetPlanEmbeddingInput {
  @Field(() => ID, { description: `Plan embedding id` })
  id!: string;
}

@InputType()
export class PlanEmbeddingsByPlanInput {
  @Field(() => ID, { description: `Plan id to list embeddings for` })
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
