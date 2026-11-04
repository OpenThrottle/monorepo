import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { ProjectsModule } from '../projects/projects.module.ts';
import { RepositoriesModule } from '../repositories/repositories.module.ts';
import { UserWorkspaceSettings } from './user-workspace-settings.entity.ts';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service.ts';
import { WorkspaceEditorConfigService } from './workspace-editor-config.service.ts';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service.ts';

@Module({
  controllers: [],
  exports: [
    UserWorkspaceSettingsService,
    WorkspaceLocalRepositoriesService,
    WorkspaceEditorConfigService,
  ],
  imports: [
    LoggerModule,
    ProjectsModule,
    RepositoriesModule,
    TypeOrmModule.forFeature([UserWorkspaceSettings]),
  ],
  providers: [
    UserWorkspaceSettingsService,
    WorkspaceLocalRepositoriesService,
    WorkspaceEditorConfigService,
  ],
})
export class WorkspaceSettingsModule {}
