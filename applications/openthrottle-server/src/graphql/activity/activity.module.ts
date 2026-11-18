/**
 * @description GraphQL module for activity-by-date-range. Imports the plans and tasks table modules for the loaders and registers request-scoped ActivityLoaders for batched plan/task resolution across the activity row resolvers.
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { ActivityResolver } from './activity.resolver.ts';
import { ActivityCommitRowResolver } from './activity-commit-row/activity-commit-row.resolver.ts';
import { ActivityOutputChunkRowResolver } from './activity-output-chunk-row/activity-output-chunk-row.resolver.ts';
import { ActivityTaskUpdatedRowResolver } from './activity-task-updated-row/activity-task-updated-row.resolver.ts';
import { ActivityLoaders } from './loaders/loaders.service.ts';

@Module({
  imports: [PlansModule, TasksModule],
  providers: [
    ActivityCommitRowResolver,
    ActivityLoaders,
    ActivityOutputChunkRowResolver,
    ActivityResolver,
    ActivityTaskUpdatedRowResolver,
  ],
})
export class ActivityGraphqlModule {}
