import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';
import { ScheduledAgentJobRunsRepository } from './scheduled-agent-job-runs.repository.ts';

/**
 * @description Registers {@link ScheduledAgentJobRun} on the default connection and provides
 * {@link ScheduledAgentJobRunsRepository}.
 * @public
 */
@Module({
  exports: [ScheduledAgentJobRunsRepository],
  imports: [TypeOrmModule.forFeature([ScheduledAgentJobRun])],
  providers: [ScheduledAgentJobRunsRepository],
})
export class ScheduledAgentJobRunsModule {}
