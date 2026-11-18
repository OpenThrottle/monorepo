/**
 * @description GraphQL module that registers TaskEmbeddingsResolver and TaskEmbeddingsLoaders (request-scoped DataLoaders) and imports the task embeddings and tasks table modules for TaskEmbeddingsRepository and TasksRepository.
 */

import { Module } from '@nestjs/common';
import {
  TaskEmbeddingsModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { TaskEmbeddingsLoaders } from './loaders/loaders.service.ts';
import { TaskEmbeddingsResolver } from './task-embeddings.resolver.ts';

@Module({
  imports: [TaskEmbeddingsModule, TasksModule],
  providers: [TaskEmbeddingsLoaders, TaskEmbeddingsResolver],
})
export class TaskEmbeddingsGraphqlModule {}
