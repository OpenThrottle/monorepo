import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { DataRetentionQueueProducerModule } from './data-retention-queue-producer.module';
import {
  DATA_RETENTION_POLICIES,
  DATA_RETENTION_POLICIES_TOKEN,
} from './data-retention.policies';
import { DataRetentionProcessor } from './data-retention.processor';
import { DataRetentionRepeatableService } from './data-retention-repeatable.service';

/**
 * @description Processor half of the data-retention queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Applies every registered
 * retention policy nightly to bound growth of the append-only agent tables. The
 * repeatable registration lives with the processor so an api-only process doesn't
 * create an orphan schedule.
 *
 * Deletes nothing unless DATA_RETENTION_ENFORCE=true — see data-retention.env.ts.
 */
@Module({
  exports: [DataRetentionQueueProducerModule],
  imports: [
    DataRetentionQueueProducerModule,
    LoggerModule,
    NestjsRepositoriesModule,
  ],
  providers: [
    DataRetentionProcessor,
    DataRetentionRepeatableService,
    {
      provide: DATA_RETENTION_POLICIES_TOKEN,
      useValue: DATA_RETENTION_POLICIES,
    },
  ],
})
export class DataRetentionQueueModule {}
