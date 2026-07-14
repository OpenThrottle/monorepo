import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { WorkLedgerSweepQueueProducerModule } from './work-ledger-sweep-queue-producer.module';
import { WorkLedgerSweepProcessor } from './work-ledger-sweep.processor';
import { WorkLedgerSweepRepeatableService } from './work-ledger-sweep-repeatable.service';

/**
 * @description Processor half of the work-ledger-sweep queue (WorkerHost + repeatable scheduler).
 * Loaded only under PROCESS_ROLE worker/all. Closes abandoned (open, past-TTL) work sessions
 * hourly. The repeatable registration lives with the processor so an api-only process doesn't
 * create an orphan schedule.
 */
@Module({
  exports: [WorkLedgerSweepQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    WorkLedgerSweepQueueProducerModule,
  ],
  providers: [WorkLedgerSweepProcessor, WorkLedgerSweepRepeatableService],
})
export class WorkLedgerSweepQueueModule {}
