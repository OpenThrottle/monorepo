/**
 * @description GraphQL ObjectType for TaskEmbedding. Mirrors the task_embeddings entity from @openthrottle/nestjs-repositories; embedding vector is not exposed.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { TaskObject } from '../tasks/task.object';

@ObjectType()
export class TaskEmbeddingObject {
  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, { description: `JSON string of metadata object` })
  metadataJson!: string;

  @Field(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  task!: TaskObject | null;

  @Field(() => String)
  taskId!: string;
}
