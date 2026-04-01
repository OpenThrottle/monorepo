/**
 * @description GraphQL module that registers TaskEmbeddingsResolver and imports NestjsRepositoriesModule for TaskEmbeddingsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { TaskEmbeddingsResolver } from './task-embeddings.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [TaskEmbeddingsResolver],
})
export class TaskEmbeddingsGraphqlModule {}
