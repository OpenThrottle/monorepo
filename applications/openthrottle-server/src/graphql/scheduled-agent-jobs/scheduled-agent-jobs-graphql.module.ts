/**
 * @description Registers the scheduled-agent-jobs GraphQL types, resolver, and orchestration service.
 * Imports the queue PRODUCER module (loads under any role) for the queue handle + shared scheduler /
 * cancellation services, so the api process can enqueue run-now and project schedulers on mutation.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ScheduledAgentJobsQueueProducerModule } from '../../queues/scheduled-agent-jobs/scheduled-agent-jobs-queue-producer.module';
import './scheduled-agent-job.object';
import './scheduled-agent-job-run-stats.object';
import './scheduled-agent-jobs.input';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service';
import { ScheduledAgentJobsLoaders } from './scheduled-agent-jobs-loaders';
import {
  ScheduledAgentJobRunRepositoryResolver,
  ScheduledAgentJobsResolver,
} from './scheduled-agent-jobs.resolver';

@Module({
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    ScheduledAgentJobsQueueProducerModule,
  ],
  providers: [
    GqlPermissionsGuard,
    ScheduledAgentJobsGraphqlService,
    ScheduledAgentJobRunRepositoryResolver,
    ScheduledAgentJobsLoaders,
    ScheduledAgentJobsResolver,
  ],
})
export class ScheduledAgentJobsGraphqlModule {}
