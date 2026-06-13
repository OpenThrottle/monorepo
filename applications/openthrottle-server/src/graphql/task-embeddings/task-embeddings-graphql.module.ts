/**
 * @description GraphQL module that registers TaskEmbeddingsResolver and TaskEmbeddingsLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for TaskEmbeddingsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { TaskEmbeddingsLoaders } from './task-embeddings-loaders';
import { TaskEmbeddingsResolver } from './task-embeddings.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [TaskEmbeddingsLoaders, TaskEmbeddingsResolver],
})
export class TaskEmbeddingsGraphqlModule {}
