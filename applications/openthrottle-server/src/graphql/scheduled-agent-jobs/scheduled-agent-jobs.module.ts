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
import {
  NestjsRepositoriesServerModule,
  RepositoryCheckoutsModule,
  RolesModule,
  ScheduledAgentJobRunsModule,
  ScheduledAgentJobsModule,
  UserDisabledAgentClisModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsQueueProducerModule } from '../../queues/scheduled-agent-jobs/producer/producer.module.ts';
import { ScheduledAgentJobCheckoutPathModule } from '../../services/scheduled-agent-job-checkout-path/scheduled-agent-job-checkout-path.module.ts';
import { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import { ScheduledAgentJobRunRepositoryResolver } from './scheduled-agent-job-run-repository/scheduled-agent-job-run-repository.resolver.ts';
import { ScheduledAgentJobsResolver } from './scheduled-agent-jobs.resolver.ts';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs.service.ts';

@Module({
  imports: [
    RolesModule,
    UserDisabledAgentClisModule,
    LoggerModule,
    RepositoryCheckoutsModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ScheduledAgentJobCheckoutPathModule,
    NestjsRepositoriesServerModule,
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
