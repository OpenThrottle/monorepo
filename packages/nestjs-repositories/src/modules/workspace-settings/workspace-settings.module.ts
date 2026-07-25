import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ProjectsModule } from '../projects/projects.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UserWorkspaceSettings } from './user-workspace-settings.entity';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';
import { WorkspaceEditorConfigService } from './workspace-editor-config.service';

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
