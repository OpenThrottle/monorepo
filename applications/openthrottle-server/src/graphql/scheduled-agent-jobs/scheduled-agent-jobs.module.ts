/**
 * @description Registers the scheduled-agent-jobs GraphQL types, resolver, and orchestration service.
 * Imports the queue PRODUCER module (loads under any role) for the queue handle + shared scheduler /
 * cancellation services, so the api process can enqueue run-now and project schedulers on mutation.
 */

import './scheduled-agent-job.object.ts';
import './scheduled-agent-job-run-stats.object.ts';
import './scheduled-agent-jobs.input.ts';

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsQueueProducerModule } from '../../queues/scheduled-agent-jobs/producer/producer.module.ts';
import { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import { ScheduledAgentJobRunRepositoryResolver } from './scheduled-agent-job-run-repository/scheduled-agent-job-run-repository.resolver.ts';
import { ScheduledAgentJobsResolver } from './scheduled-agent-jobs.resolver.ts';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs.service.ts';

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
