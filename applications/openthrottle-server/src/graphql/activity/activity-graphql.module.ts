/**
 * @description GraphQL module for activity-by-date-range. Imports NestjsRepositoriesModule for PlansService (raw SQL) and registers request-scoped ActivityLoaders for batched plan/task resolution across the activity row resolvers.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { ActivityLoaders } from './activity-loaders';
import {
  ActivityCommitRowResolver,
  ActivityOutputChunkRowResolver,
  ActivityResolver,
  ActivityTaskUpdatedRowResolver,
} from './activity.resolver';

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
