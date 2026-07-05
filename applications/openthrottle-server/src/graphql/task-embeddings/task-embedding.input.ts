/**
 * @description GraphQL input types for task-embedding queries. Single input argument per operation for consistency with other resolvers.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetTaskEmbeddingInput {
  @Field(() => ID, { description: `Task embedding id` })
  id!: string;
}

@InputType()
export class TaskEmbeddingsByTaskInput {
  @Field(() => ID, { description: `Task id to list embeddings for` })
  taskId!: string;

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
