/**
 * @description GraphQL input types for task-embedding queries. Single input argument per operation for consistency with other resolvers.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class GetTaskEmbeddingInput {
  @Field(() => ID, { description: `Task embedding id` })
  id!: string;
}

@InputType()
export class TaskEmbeddingsByTaskInput {
  @Field(() => ID, { description: `Task id to list embeddings for` })
  taskId!: string;
}
