/**
 * @description GraphQL input for semantic search over plan/task embeddings.
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SearchInput {
  @Field(() => Int, {
    description: `Max number of chunks to return (default 20).`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => String, {
    description: `Text query to embed and search by vector similarity.`,
  })
  query!: string;
}
