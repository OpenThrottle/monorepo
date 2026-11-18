/**
 * @description Translates a scheduled job's `repositoryCheckoutId` into the directory its agent CLI
 * is spawned in, for the GraphQL write path and the scheduled-agent-jobs worker alike.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsModule } from '@openthrottle/nestjs-repositories-server';

import { ScheduledAgentJobCheckoutPathService } from './scheduled-agent-job-checkout-path.service.ts';

@Module({
  exports: [ScheduledAgentJobCheckoutPathService],
  imports: [LoggerModule, RepositoryCheckoutsModule],
  providers: [ScheduledAgentJobCheckoutPathService],
})
export class ScheduledAgentJobCheckoutPathModule {}
