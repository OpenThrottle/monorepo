import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { RepositoriesModule } from '../repositories/repositories.module.ts';
import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import { ScheduledAgentJobCheckoutPathService } from './scheduled-agent-job-checkout-path.service.ts';
import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';
import { ScheduledAgentJobsService } from './scheduled-agent-jobs.service.ts';

@Module({
  controllers: [],
  exports: [ScheduledAgentJobCheckoutPathService, ScheduledAgentJobsService],
  imports: [
    LoggerModule,
    // For RepositoryCheckoutsService, which backs the checkout -> cwd resolution.
    RepositoriesModule,
    TypeOrmModule.forFeature([ScheduledAgentJob, ScheduledAgentJobRun]),
  ],
  providers: [ScheduledAgentJobCheckoutPathService, ScheduledAgentJobsService],
})
export class ScheduledAgentJobsModule {}
