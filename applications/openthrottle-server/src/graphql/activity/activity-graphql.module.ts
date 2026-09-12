/**
 * @description GraphQL module for activity-by-date-range. Imports NestjsRepositoriesModule for PlansService (raw SQL) and registers request-scoped ActivityLoaders for batched plan/task resolution across the activity row resolvers.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import {
  ActivityCommitRowResolver,
  ActivityOutputChunkRowResolver,
  ActivityResolver,
  ActivityTaskUpdatedRowResolver,
} from './activity.resolver';
import { ActivityLoaders } from './activity-loaders';

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
