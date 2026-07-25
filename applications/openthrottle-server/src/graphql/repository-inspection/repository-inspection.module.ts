/**
 * @description Provides RepositoryInspectionService (read-only checkout
 * scans persisted onto repository_checkouts.inspection). Resolvers arrive
 * with the workspace-onboarding GraphQL surface; this module only wires the
 * service so addWorkspaceFolder/refreshCheckout can consume it.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RepositoryInspectionService } from './repository-inspection.service';

@Module({
  controllers: [],
  exports: [RepositoryInspectionService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [RepositoryInspectionService],
})
export class RepositoryInspectionModule {}
