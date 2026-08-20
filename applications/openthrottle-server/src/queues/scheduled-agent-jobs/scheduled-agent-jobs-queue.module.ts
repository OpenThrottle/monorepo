import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobDirectoryLockService } from './scheduled-agent-job-directory-lock.service';
import { ScheduledAgentJobsProcessor } from './scheduled-agent-jobs.processor';
import { ScheduledAgentJobsQueueProducerModule } from './scheduled-agent-jobs-queue-producer.module';
import { ScheduledAgentJobsReconcileService } from './scheduled-agent-jobs-reconcile.service';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service';

/**
 * @description Processor half of the scheduled-agent-jobs queue (WorkerHost + driver runner). Loaded
 * only under PROCESS_ROLE worker/all. Runs any user-defined scheduled prompt via
 * openthrottle-drivers `runAgentPrompt`, streaming output to the JSONL sink and recording each run.
 * The DB↔BullMQ reconciler is added to this module by the reconciliation task. `NestjsRedisModule`
 * supplies the control-plane client behind {@link ScheduledAgentJobDirectoryLockService}, the advisory
 * per-directory lock that makes worker concurrency > 1 safe.
 */
@Module({
  exports: [ScheduledAgentJobsQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRedisModule,
    NestjsRepositoriesModule,
    ScheduledAgentJobsQueueProducerModule,
  ],
  providers: [
    ScheduledAgentJobDirectoryLockService,
    ScheduledAgentJobsProcessor,
    ScheduledAgentJobsReconcileService,
    ScheduledAgentRunnerService,
  ],
})
export class ScheduledAgentJobsQueueModule {}
