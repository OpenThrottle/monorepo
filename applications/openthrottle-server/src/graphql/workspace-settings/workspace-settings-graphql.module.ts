/**
 * @description Registers workspace settings GraphQL types, local repository
 * CRUD (deprecated surface), and the add-folder onboarding gesture.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ForeignSkillInjectionModule } from '../../services/foreign-skill-injection/foreign-skill-injection.module';
import { WorktreeActivityModule } from '../../services/worktree-activity/worktree-activity.module';
import { RepositoryInspectionModule } from '../repository-inspection/repository-inspection.module';
import './workspace-editor-id.enum';
import './user-workspace-profile.object';
import './workspace-local-repository.object';
import './workspace-settings.object';
import './workspace-settings.input';
import './apply-workspace-editor-configuration.input';
import './workspace-editor-config-application.object';
import './repository.object';
import './discovered-worktrees.object';
import './workspace-folders.input';
import './workspace-folders.object';
import { DiscoveredWorktreesResolver } from './discovered-worktrees.resolver';
import { WorkspaceFoldersResolver } from './workspace-folders.resolver';
import { WorkspaceFoldersService } from './workspace-folders.service';
import { WorkspaceSettingsLoaders } from './workspace-settings-loaders';
import { WorkspaceSettingsResolver } from './workspace-settings.resolver';

@Module({
  imports: [
    ForeignSkillInjectionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    RepositoryInspectionModule,
    WorktreeActivityModule,
  ],
  providers: [
    DiscoveredWorktreesResolver,
    GqlPermissionsGuard,
    WorkspaceFoldersResolver,
    WorkspaceFoldersService,
    WorkspaceSettingsLoaders,
    WorkspaceSettingsResolver,
  ],
})
export class WorkspaceSettingsGraphqlModule {}
