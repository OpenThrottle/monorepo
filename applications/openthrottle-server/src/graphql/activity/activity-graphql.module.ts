/**
 * @description GraphQL module for activity-by-date-range. Imports NestjsRepositoriesModule for PlansService and TasksService (used for raw SQL and ResolveField).
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
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
    ActivityOutputChunkRowResolver,
    ActivityResolver,
    ActivityTaskUpdatedRowResolver,
  ],
})
export class ActivityGraphqlModule {}
