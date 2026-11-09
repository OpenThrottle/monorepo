/**
 * @description GraphQL module for activity-by-date-range. Imports NestjsRepositoriesModule for PlansService (raw SQL) and registers request-scoped ActivityLoaders for batched plan/task resolution across the activity row resolvers.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ActivityResolver } from './activity.resolver.ts';
import { ActivityCommitRowResolver } from './activity-commit-row/activity-commit-row.resolver.ts';
import { ActivityOutputChunkRowResolver } from './activity-output-chunk-row/activity-output-chunk-row.resolver.ts';
import { ActivityTaskUpdatedRowResolver } from './activity-task-updated-row/activity-task-updated-row.resolver.ts';
import { ActivityLoaders } from './loaders/loaders.service.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [
    ActivityCommitRowResolver,
    ActivityLoaders,
    ActivityOutputChunkRowResolver,
    ActivityResolver,
    ActivityTaskUpdatedRowResolver,
  ],
})
export class ActivityGraphqlModule {}
