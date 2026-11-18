import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import { ScheduledAgentJobsRepository } from './scheduled-agent-jobs.repository.ts';

/**
 * @description Registers {@link ScheduledAgentJob} on the default connection and provides
 * {@link ScheduledAgentJobsRepository}.
 * @public
 */
@Module({
  exports: [ScheduledAgentJobsRepository],
  imports: [TypeOrmModule.forFeature([ScheduledAgentJob])],
  providers: [ScheduledAgentJobsRepository],
})
export class ScheduledAgentJobsModule {}
