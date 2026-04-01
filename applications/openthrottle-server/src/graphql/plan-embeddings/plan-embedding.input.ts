/**
 * @description GraphQL input types for plan-embedding queries. Single input argument per operation for consistency with other resolvers.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class GetPlanEmbeddingInput {
  @Field(() => ID, { description: `Plan embedding id` })
  id!: string;
}

@InputType()
export class PlanEmbeddingsByPlanInput {
  @Field(() => ID, { description: `Plan id to list embeddings for` })
  planId!: string;
}
