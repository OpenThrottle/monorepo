import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobsProcessor } from './scheduled-agent-jobs.processor';
import { ScheduledAgentJobsQueueProducerModule } from './scheduled-agent-jobs-queue-producer.module';
import { ScheduledAgentJobsReconcileService } from './scheduled-agent-jobs-reconcile.service';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service';

/**
 * @description Processor half of the scheduled-agent-jobs queue (WorkerHost + driver runner). Loaded
 * only under PROCESS_ROLE worker/all. Runs any user-defined scheduled prompt via
 * openthrottle-drivers `runAgentPrompt`, streaming output to the JSONL sink and recording each run.
 * The DB↔BullMQ reconciler is added to this module by the reconciliation task.
 */
@Module({
  exports: [ScheduledAgentJobsQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    ScheduledAgentJobsQueueProducerModule,
  ],
  providers: [
    ScheduledAgentJobsProcessor,
    ScheduledAgentJobsReconcileService,
    ScheduledAgentRunnerService,
  ],
})
export class ScheduledAgentJobsQueueModule {}
