/**
 * @description Resolver for TaskEmbedding queries. Injects TaskEmbeddingsRepository from @openthrottle/nestjs-repositories-server and maps entities to TaskEmbeddingObject.
 */

import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import type {
  Task,
  TaskEmbedding,
} from '@openthrottle/nestjs-repositories-server';
import { TaskEmbeddingsRepository } from '@openthrottle/nestjs-repositories-server';

import { TaskObject } from '../tasks/task.object.ts';
import { TaskEmbeddingsLoaders } from './loaders/loaders.service.ts';
import {
  GetTaskEmbeddingInput,
  TaskEmbeddingsByTaskInput,
} from './task-embedding.input.ts';
import { TaskEmbeddingObject } from './task-embedding.object.ts';

/** Default and hard ceiling for the unbounded list query (bounds API memory). */
const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 1000;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => TaskEmbeddingObject)
export class TaskEmbeddingsResolver {
  constructor(
    private readonly loaders: TaskEmbeddingsLoaders,
    private readonly taskEmbeddingsRepository: TaskEmbeddingsRepository,
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
    const entity = await this.taskEmbeddingsRepository.findOne({
      where: { id: input.id },
    });

    return entity;
  }

  @Query(() => [TaskEmbeddingObject], {
    description: `List task embeddings by task ID, ordered by createdAt ascending`,
  })
  async taskEmbeddings(
    @Args('input', { type: () => TaskEmbeddingsByTaskInput })
    input: TaskEmbeddingsByTaskInput,
  ): Promise<TaskEmbedding[]> {
    const take = Math.min(
      Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT),
      MAX_LIST_LIMIT,
    );
    const skip = Math.max(0, input.offset ?? 0);

    const entities = await this.taskEmbeddingsRepository.findBy({
      order: { createdAt: 'ASC' },
      skip,
      take,
      where: { taskId: input.taskId },
    });

    return entities;
  }
}
