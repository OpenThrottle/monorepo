/**
 * @description GraphQL feature module for the work ledger (sessions + artifacts + subjects).
 * Imports NestjsRepositoriesModule for WorkLedgerService (the three TypeORM repositories).
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerResolver } from './work-ledger.resolver';
import { WorkLedgerCaptureService } from './work-ledger-capture.service';

@Module({
  exports: [WorkLedgerCaptureService],
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [WorkLedgerCaptureService, WorkLedgerResolver],
})
export class WorkLedgerGraphqlModule {}
