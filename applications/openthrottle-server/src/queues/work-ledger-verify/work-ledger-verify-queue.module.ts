import { Module } from '@nestjs/common';
import { GitHubModule } from '@openthrottle/nestjs-github';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { WorkLedgerVerifyQueueProducerModule } from './work-ledger-verify-queue-producer.module';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor';
import { WorkLedgerVerifyRepeatableService } from './work-ledger-verify-repeatable.service';

/**
 * @description Processor half of the work-ledger-verify queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Verifies unverified git_commit
 * artifacts against GitHub (existence) on a 15-minute sweep. The repeatable registration
 * lives with the processor so an api-only process doesn't create an orphan schedule.
 */
@Module({
  exports: [WorkLedgerVerifyQueueProducerModule],
  imports: [
    GitHubModule,
    LoggerModule,
    NestjsRepositoriesModule,
    WorkLedgerVerifyQueueProducerModule,
  ],
  providers: [WorkLedgerVerifyProcessor, WorkLedgerVerifyRepeatableService],
})
export class WorkLedgerVerifyQueueModule {}
