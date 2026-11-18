import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanRunsModule,
  WorkArtifactsModule,
  WorkSessionsModule,
  WorkSessionSubjectsModule,
} from '@openthrottle/nestjs-repositories-server';

import { SourceControlModule } from '../../services/source-control/source-control.module.ts';
import { TaggingQueueProducerModule } from '../tagging/producer/producer.module.ts';
import { WorkLedgerVerifyQueueProducerModule } from './producer/producer.module.ts';
import { WorkLedgerVerifyRepeatableService } from './repeatable/repeatable.service.ts';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor.ts';

/**
 * @description Processor half of the work-ledger-verify queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Verifies unverified git_commit
 * artifacts against their forge (existence) on a 15-minute sweep. The repeatable registration
 * lives with the processor so an api-only process doesn't create an orphan schedule.
 */
@Module({
  exports: [WorkLedgerVerifyQueueProducerModule],
  imports: [
    LoggerModule,
    PlanRunsModule,
    SourceControlModule,
    TaggingQueueProducerModule,
    WorkArtifactsModule,
    WorkLedgerVerifyQueueProducerModule,
    WorkSessionsModule,
    WorkSessionSubjectsModule,
  ],
  providers: [WorkLedgerVerifyProcessor, WorkLedgerVerifyRepeatableService],
})
export class WorkLedgerVerifyQueueModule {}
