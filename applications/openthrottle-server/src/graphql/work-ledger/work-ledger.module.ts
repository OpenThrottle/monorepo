/**
 * @description GraphQL feature module for the work ledger (sessions + artifacts + subjects).
 * Imports the three work-ledger table modules (sessions, subjects, artifacts) and
 * LoggerModule for SettleRunLedgerService, whose failures are logged rather than thrown, and
 * RepositoryInspectionModule so a service-account run's settle can resolve its repo from the
 * working directory's git remote.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import {
  NestjsRepositoriesServerModule,
  PlanRunsModule,
  ServiceAccountsModule,
  WorkArtifactsModule,
  WorkSessionsModule,
  WorkSessionSubjectsModule,
} from '@openthrottle/nestjs-repositories-server';

import { SourceControlModule } from '../../services/source-control/source-control.module.ts';
import { RepositoryInspectionModule } from '../repository-inspection/repository-inspection.module.ts';
import { SettleRunLedgerService } from './settle-run-ledger/settle-run-ledger.service.ts';
import { StatusChangeSystemAccountService } from './status-change-system-account/status-change-system-account.service.ts';
import { WorkLedgerResolver } from './work-ledger.resolver.ts';
import { WorkLedgerCaptureService } from './work-ledger-capture/work-ledger-capture.service.ts';

@Module({
  exports: [
    SettleRunLedgerService,
    StatusChangeSystemAccountService,
    WorkLedgerCaptureService,
  ],
  imports: [
    GlobalClsModule,
    LoggerModule,
    NestjsRepositoriesServerModule,
    PlanRunsModule,
    RepositoryInspectionModule,
    ServiceAccountsModule,
    SourceControlModule,
    WorkArtifactsModule,
    WorkSessionsModule,
    WorkSessionSubjectsModule,
  ],
  providers: [
    SettleRunLedgerService,
    StatusChangeSystemAccountService,
    WorkLedgerCaptureService,
    WorkLedgerResolver,
  ],
})
export class WorkLedgerGraphqlModule {}
