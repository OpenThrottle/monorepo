/**
 * @description Registers workspace settings GraphQL types, local repository
 * CRUD (deprecated surface), and the add-folder onboarding gesture.
 */

import './workspace-editor-id.enum.ts';
import './user-workspace-profile.object.ts';
import './workspace-local-repository.object.ts';
import './workspace-settings.object.ts';
import './workspace-settings.input.ts';
import './apply-workspace-editor-configuration.input.ts';
import './workspace-editor-config-application.object.ts';
import './repository.object.ts';
import './discovered-worktrees.object.ts';
import './workspace-folders.input.ts';
import './workspace-folders.object.ts';
import './prune-worktree-checkouts.input.ts';
import './prune-worktree-checkouts.object.ts';
import './remove-plan-run-worktree.object.ts';

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ForeignSkillInjectionModule } from '../../services/foreign-skill-injection/foreign-skill-injection.module.ts';
import { PlanRunWorktreeTeardownModule } from '../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.module.ts';
import { WorktreeActivityModule } from '../../services/worktree-activity/worktree-activity.module.ts';
import { WorktreeCheckoutPruneModule } from '../../services/worktree-checkout-prune/worktree-checkout-prune.module.ts';
import { RepositoryInspectionModule } from '../repository-inspection/repository-inspection.module.ts';
import { DiscoveredWorktreeResolver } from './discovered-worktree/discovered-worktree.resolver.ts';
import { DiscoveredWorktreesResolver } from './discovered-worktrees/discovered-worktrees.resolver.ts';
import { WorkspaceSettingsLoaders } from './loaders/loaders.service.ts';
import { WorkspaceFoldersResolver } from './workspace-folders/workspace-folders.resolver.ts';
import { WorkspaceFoldersService } from './workspace-folders/workspace-folders.service.ts';
import { WorkspaceSettingsResolver } from './workspace-settings.resolver.ts';

@Module({
  imports: [
    ForeignSkillInjectionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRunWorktreeTeardownModule,
    RepositoryInspectionModule,
    WorktreeActivityModule,
    WorktreeCheckoutPruneModule,
  ],
  providers: [
    DiscoveredWorktreeResolver,
    DiscoveredWorktreesResolver,
    GqlPermissionsGuard,
    WorkspaceFoldersResolver,
    WorkspaceFoldersService,
    WorkspaceSettingsLoaders,
    WorkspaceSettingsResolver,
  ],
})
export class WorkspaceSettingsGraphqlModule {}
