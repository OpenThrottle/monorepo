/**
 * @description Resolver for TaskEmbedding queries. Injects TaskEmbeddingsService from @openthrottle/nestjs-repositories and maps entities to TaskEmbeddingObject.
 */

import type { Task, TaskEmbedding } from '@openthrottle/nestjs-repositories';
import { TaskEmbeddingsService } from '@openthrottle/nestjs-repositories';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TaskObject } from '../tasks/task.object';
import {
  GetTaskEmbeddingInput,
  TaskEmbeddingsByTaskInput,
} from './task-embedding.input';
import { TaskEmbeddingObject } from './task-embedding.object';
import { TaskEmbeddingsLoaders } from './task-embeddings-loaders';

// @authz-stance: authenticated-only (Path A — see docs/openthrottle/resolver-authorization-model-adr.md)
@Resolver(() => TaskEmbeddingObject)
export class TaskEmbeddingsResolver {
  constructor(
    private readonly loaders: TaskEmbeddingsLoaders,
    private readonly taskEmbeddingsService: TaskEmbeddingsService,
  ) {}

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  async task(@Parent() parent: TaskEmbeddingObject): Promise<Task | null> {
    if (!parent.taskId) return null;

    return this.loaders.taskLoader.load(parent.taskId);
  }

  @Query(() => TaskEmbeddingObject, {
    description: `Get a task embedding by ID`,
    nullable: true,
  })
  async taskEmbedding(
    @Args('input', { type: () => GetTaskEmbeddingInput })
    input: GetTaskEmbeddingInput,
  ): Promise<TaskEmbedding | null> {
    const entity = await this.taskEmbeddingsService
      .getRepository()
      .findOne({ where: { id: input.id } });

    return entity;
  }

  @Query(() => [TaskEmbeddingObject], {
    description: `List task embeddings by task ID, ordered by createdAt ascending`,
  })
  async taskEmbeddings(
    @Args('input', { type: () => TaskEmbeddingsByTaskInput })
    input: TaskEmbeddingsByTaskInput,
  ): Promise<TaskEmbedding[]> {
    const entities = await this.taskEmbeddingsService
      .getRepository()
      .find({ order: { createdAt: 'ASC' }, where: { taskId: input.taskId } });

    return entities;
  }
}
