import { Module } from '@nestjs/common';
import { GitHubModule } from '@openthrottle/nestjs-github';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerHarvestProcessor } from './work-ledger-harvest.processor.ts';
import { WorkLedgerHarvestQueueProducerModule } from './work-ledger-harvest-queue-producer.module.ts';
import { WorkLedgerHarvestRepeatableService } from './work-ledger-harvest-repeatable.service.ts';

/**
 * @description Processor half of the work-ledger-harvest queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Reads Plan-Id: trailers off each
 * eligible repo's default branch hourly and adopts the commits nobody recorded. The repeatable
 * registration lives with the processor so an api-only process doesn't create an orphan schedule.
 */
@Module({
  exports: [WorkLedgerHarvestQueueProducerModule],
  imports: [
    GitHubModule,
    LoggerModule,
    NestjsRepositoriesModule,
    WorkLedgerHarvestQueueProducerModule,
  ],
  providers: [WorkLedgerHarvestProcessor, WorkLedgerHarvestRepeatableService],
})
export class WorkLedgerHarvestQueueModule {}
