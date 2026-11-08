import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { ScheduledAgentJobDirectoryLockService } from './directory-lock/directory-lock.service.ts';
import { ScheduledAgentJobFailureNotifierService } from './failure-notifier/failure-notifier.service.ts';
import { ScheduledAgentJobsQueueProducerModule } from './producer/producer.module.ts';
import { ScheduledAgentJobsReconcileService } from './reconcile/reconcile.service.ts';
import { ScheduledAgentRunnerService } from './runner/runner.service.ts';
import { ScheduledAgentJobsProcessor } from './scheduled-agent-jobs.processor.ts';
import { SCHEDULED_RUN_FAILURE_CHANNELS } from './scheduled-run-failure-channels.token.ts';
import { ScheduledAgentJobStuckRunRecoveryService } from './stuck-run-recovery/stuck-run-recovery.service.ts';
import { ScheduledAgentJobUsageLimitResumeService } from './usage-limit-resume/usage-limit-resume.service.ts';

/**
 * @description Processor half of the scheduled-agent-jobs queue (WorkerHost + driver runner). Loaded
 * only under PROCESS_ROLE worker/all. Runs any user-defined scheduled prompt via
 * openthrottle-drivers `runAgentPrompt`, streaming output to the JSONL sink and recording each run.
 * The DB↔BullMQ reconciler is added to this module by the reconciliation task. `NestjsRedisModule`
 * supplies the control-plane client behind {@link ScheduledAgentJobDirectoryLockService}, the advisory
 * per-directory lock that makes worker concurrency > 1 safe.
 * {@link ScheduledAgentJobStuckRunRecoveryService} fails the runs a crash left `running`, at boot.
 * {@link ScheduledAgentJobFailureNotifierService} tells a schedule's owner when a run fails, times
 * out or is missed; {@link SCHEDULED_RUN_FAILURE_CHANNELS} is the hook for Slack and Web Push,
 * empty by default.
 */
@Module({
  exports: [ScheduledAgentJobsQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRedisModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    ScheduledAgentJobsQueueProducerModule,
  ],
  providers: [
    // No out-of-app channel ships yet; a Slack or Web Push module overrides this list.
    { provide: SCHEDULED_RUN_FAILURE_CHANNELS, useValue: [] },
    ScheduledAgentJobDirectoryLockService,
    ScheduledAgentJobFailureNotifierService,
    ScheduledAgentJobsProcessor,
    ScheduledAgentJobsReconcileService,
    ScheduledAgentJobStuckRunRecoveryService,
    ScheduledAgentJobUsageLimitResumeService,
    ScheduledAgentRunnerService,
  ],
})
export class ScheduledAgentJobsQueueModule {}
