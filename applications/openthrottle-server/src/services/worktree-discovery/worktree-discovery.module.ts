/**
 * @description On-disk discovery of the git worktrees belonging to a user's repositories, for
 * /settings/repositories. Read-only: nothing here creates, prunes or removes a worktree.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  RepositoryCheckoutsModule,
  UserWorkspaceSettingsModule,
} from '@openthrottle/nestjs-repositories-server';

import { GitRunnerModule } from '../git-runner/git-runner.module.ts';
import { WorktreeDiscoveryService } from './worktree-discovery.service.ts';

@Module({
  exports: [WorktreeDiscoveryService],
  imports: [
    GitRunnerModule,
    LoggerModule,
    RepositoryCheckoutsModule,
    UserWorkspaceSettingsModule,
  ],
  providers: [WorktreeDiscoveryService],
})
export class WorktreeDiscoveryModule {}
