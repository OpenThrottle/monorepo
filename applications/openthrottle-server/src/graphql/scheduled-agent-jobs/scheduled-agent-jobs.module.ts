/**
 * @description Registers the scheduled-agent-jobs GraphQL types, resolver, and orchestration service.
 * Imports the queue PRODUCER module (loads under any role) for the queue handle + shared scheduler /
 * cancellation services, so the api process can enqueue run-now and project schedulers on mutation.
 */

import './scheduled-agent-job.object.ts';
import './scheduled-agent-job-run-stats.object.ts';
import './scheduled-agent-jobs.input.ts';
import './scheduled-agent-job-agent/scheduled-agent-job-agent.input.ts';
import './scheduled-agent-job-webhook-trigger/scheduled-agent-job-webhook-trigger.input.ts';
import './scheduled-agent-job-webhook-trigger/scheduled-agent-job-webhook-trigger.object.ts';

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  RepositoryCheckoutsModule,
  RolesModule,
  ScheduledAgentJobRunsModule,
  ScheduledAgentJobsModule,
  ScheduledAgentJobWebhookDeliveriesModule,
  ScheduledAgentJobWebhookTriggersModule,
  UserDisabledAgentClisModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsQueueProducerModule } from '../../queues/scheduled-agent-jobs/producer/producer.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { ScheduledAgentJobCheckoutPathModule } from '../../services/scheduled-agent-job-checkout-path/scheduled-agent-job-checkout-path.module.ts';
import { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import { ScheduledAgentJobAgentResolver } from './scheduled-agent-job-agent/scheduled-agent-job-agent.resolver.ts';
import { ScheduledAgentJobAgentService } from './scheduled-agent-job-agent/scheduled-agent-job-agent.service.ts';
import { ScheduledAgentJobRunRepositoryResolver } from './scheduled-agent-job-run-repository/scheduled-agent-job-run-repository.resolver.ts';
import { ScheduledAgentJobWebhookTriggerResolver } from './scheduled-agent-job-webhook-trigger/scheduled-agent-job-webhook-trigger.resolver.ts';
import { ScheduledAgentJobWebhookTriggerService } from './scheduled-agent-job-webhook-trigger/scheduled-agent-job-webhook-trigger.service.ts';
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
    ScheduledAgentJobWebhookDeliveriesModule,
    ScheduledAgentJobWebhookTriggersModule,
    ScheduledAgentJobCheckoutPathModule,
    ScheduledAgentJobsQueueProducerModule,
    EffectiveUserResolutionModule,
  ],
  providers: [
    GqlPermissionsGuard,
    ScheduledAgentJobAgentResolver,
    ScheduledAgentJobAgentService,
    ScheduledAgentJobsGraphqlService,
    ScheduledAgentJobRunRepositoryResolver,
    ScheduledAgentJobsLoaders,
    ScheduledAgentJobsResolver,
    ScheduledAgentJobWebhookTriggerResolver,
    ScheduledAgentJobWebhookTriggerService,
  ],
})
export class ScheduledAgentJobsGraphqlModule {}
