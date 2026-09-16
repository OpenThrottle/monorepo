import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';

import { WORK_LEDGER_HARVEST_QUEUE_NAME } from './work-ledger-harvest.constants.ts';

/**
 * @description Producer half of the work-ledger-harvest queue: registerQueue +
 * Bull Board listing, no WorkerHost. Safe under any PROCESS_ROLE; the processor
 * and repeatable scheduler live in {@link WorkLedgerHarvestQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(WORK_LEDGER_HARVEST_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(WORK_LEDGER_HARVEST_QUEUE_NAME),
  ],
})
export class WorkLedgerHarvestQueueProducerModule {}
