/**
 * @description GraphQL module that registers CommitLinksResolver and CommitLinksLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for CommitLinksService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module';
import { CommitLinksLoaders } from './commit-links-loaders';
import { CommitLinksResolver } from './commit-links.resolver';

@Module({
  imports: [NestjsRepositoriesModule, TaggingQueueProducerModule],
  providers: [CommitLinksLoaders, CommitLinksResolver],
})
export class CommitLinksGraphqlModule {}
