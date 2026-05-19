import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ProjectsModule } from '../projects/projects.module';
import { UserWorkspaceSettings } from './user-workspace-settings.entity';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import { WorkspaceLocalRepository } from './workspace-local-repository.entity';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';

@Module({
  controllers: [],
  exports: [UserWorkspaceSettingsService, WorkspaceLocalRepositoriesService],
  imports: [
    LoggerModule,
    ProjectsModule,
    TypeOrmModule.forFeature([UserWorkspaceSettings, WorkspaceLocalRepository]),
  ],
  providers: [UserWorkspaceSettingsService, WorkspaceLocalRepositoriesService],
})
export class WorkspaceSettingsModule {}
