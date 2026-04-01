/**
 * @description GraphQL ObjectType for PlanEmbedding. Mirrors the plan_embeddings entity from @openthrottle/nestjs-repositories; embedding vector is not exposed.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';

@ObjectType()
export class PlanEmbeddingObject {
  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, { description: `JSON string of metadata object` })
  metadataJson!: string;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;
}
