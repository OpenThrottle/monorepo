/**
 * @description Legacy workspace local-repository views over repositories + repository checkouts.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  ProjectsModule,
  RepositoriesModule,
  RepositoryCheckoutsModule,
} from '@openthrottle/nestjs-repositories-server';

import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service.ts';

@Module({
  exports: [WorkspaceLocalRepositoriesService],
  imports: [
    LoggerModule,
    ProjectsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
  ],
  providers: [WorkspaceLocalRepositoriesService],
})
export class WorkspaceLocalRepositoriesModule {}
