/**
 * @description GraphQL module that registers TaskEmbeddingsResolver and TaskEmbeddingsLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for TaskEmbeddingsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { TaskEmbeddingsResolver } from './task-embeddings.resolver';
import { TaskEmbeddingsLoaders } from './task-embeddings-loaders';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [TaskEmbeddingsLoaders, TaskEmbeddingsResolver],
})
export class TaskEmbeddingsGraphqlModule {}
