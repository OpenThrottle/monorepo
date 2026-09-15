/**
 * @description GraphQL feature module for the work ledger (sessions + artifacts + subjects).
 * Imports NestjsRepositoriesModule for WorkLedgerService (the three TypeORM repositories) and
 * LoggerModule for SettleRunLedgerService, whose failures are logged rather than thrown.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { SettleRunLedgerService } from './settle-run-ledger.service.ts';
import { WorkLedgerResolver } from './work-ledger.resolver.ts';
import { WorkLedgerCaptureService } from './work-ledger-capture.service.ts';

@Module({
  exports: [SettleRunLedgerService, WorkLedgerCaptureService],
  imports: [GlobalClsModule, LoggerModule, NestjsRepositoriesModule],
  providers: [
    SettleRunLedgerService,
    WorkLedgerCaptureService,
    WorkLedgerResolver,
  ],
})
export class WorkLedgerGraphqlModule {}
