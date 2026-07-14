import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { WORK_LEDGER_VERIFY_QUEUE_NAME } from './work-ledger-verify.constants';

/**
 * @description Producer half of the work-ledger-verify queue: registerQueue +
 * Bull Board listing, no WorkerHost. Safe under any PROCESS_ROLE; the processor
 * and repeatable scheduler live in {@link WorkLedgerVerifyQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(WORK_LEDGER_VERIFY_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(WORK_LEDGER_VERIFY_QUEUE_NAME),
  ],
})
export class WorkLedgerVerifyQueueProducerModule {}
