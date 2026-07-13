import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { WORK_LEDGER_SWEEP_QUEUE_NAME } from './work-ledger-sweep.constants';

/**
 * @description Producer half of the work-ledger-sweep queue: registerQueue + Bull Board,
 * no WorkerHost. Safe under any PROCESS_ROLE; the processor + repeatable scheduler live in
 * {@link WorkLedgerSweepQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(WORK_LEDGER_SWEEP_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(WORK_LEDGER_SWEEP_QUEUE_NAME),
  ],
})
export class WorkLedgerSweepQueueProducerModule {}
