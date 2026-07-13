/**
 * @description GraphQL feature module for the work ledger (sessions + artifacts + subjects).
 * Imports NestjsRepositoriesModule for WorkLedgerService (the three TypeORM repositories).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { WorkLedgerResolver } from './work-ledger.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [WorkLedgerResolver],
})
export class WorkLedgerGraphqlModule {}
