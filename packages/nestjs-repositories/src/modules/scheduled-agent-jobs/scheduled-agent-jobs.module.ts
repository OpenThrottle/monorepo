import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJob } from './scheduled-agent-job.entity';
import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity';
import { ScheduledAgentJobsService } from './scheduled-agent-jobs.service';

@Module({
  controllers: [],
  exports: [ScheduledAgentJobsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([ScheduledAgentJob, ScheduledAgentJobRun]),
  ],
  providers: [ScheduledAgentJobsService],
})
export class ScheduledAgentJobsModule {}
