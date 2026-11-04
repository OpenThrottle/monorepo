/**
 * @description GraphQL feature module for the work ledger (sessions + artifacts + subjects).
 * Imports NestjsRepositoriesModule for WorkLedgerService (the three TypeORM repositories) and
 * LoggerModule for SettleRunLedgerService, whose failures are logged rather than thrown, and
 * RepositoryInspectionModule so a service-account run's settle can resolve its repo from the
 * working directory's git remote.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { RepositoryInspectionModule } from '../repository-inspection/repository-inspection.module.ts';
import { SettleRunLedgerService } from './settle-run-ledger.service.ts';
import { StatusChangeSystemAccountService } from './status-change-system-account.service.ts';
import { WorkLedgerResolver } from './work-ledger.resolver.ts';
import { WorkLedgerCaptureService } from './work-ledger-capture.service.ts';

@Module({
  exports: [
    SettleRunLedgerService,
    StatusChangeSystemAccountService,
    WorkLedgerCaptureService,
  ],
  imports: [
    GlobalClsModule,
    LoggerModule,
    NestjsRepositoriesModule,
    RepositoryInspectionModule,
  ],
  providers: [
    SettleRunLedgerService,
    StatusChangeSystemAccountService,
    WorkLedgerCaptureService,
    WorkLedgerResolver,
  ],
})
export class WorkLedgerGraphqlModule {}
