import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlansModule,
  RepositoriesModule,
  ServiceAccountsModule,
  UsersModule,
  WorkArtifactsModule,
} from '@openthrottle/nestjs-repositories-server';

import { WorkLedgerGraphqlModule } from '../../graphql/work-ledger/work-ledger.module.ts';
import { SourceControlModule } from '../../services/source-control/source-control.module.ts';
import { WorkLedgerHarvestQueueProducerModule } from './producer/producer.module.ts';
import { WorkLedgerHarvestRepeatableService } from './repeatable/repeatable.service.ts';
import { WorkLedgerHarvestProcessor } from './work-ledger-harvest.processor.ts';

/**
 * @description Processor half of the work-ledger-harvest queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Reads Plan-Id: trailers off each
 * eligible repo's default branch hourly and adopts the commits nobody recorded. The repeatable
 * registration lives with the processor so an api-only process doesn't create an orphan schedule.
 */
@Module({
  exports: [WorkLedgerHarvestQueueProducerModule],
  imports: [
    ServiceAccountsModule,
    UsersModule,
    LoggerModule,
    PlansModule,
    RepositoriesModule,
    SourceControlModule,
    WorkArtifactsModule,
    WorkLedgerGraphqlModule,
    WorkLedgerHarvestQueueProducerModule,
  ],
  providers: [WorkLedgerHarvestProcessor, WorkLedgerHarvestRepeatableService],
})
export class WorkLedgerHarvestQueueModule {}
