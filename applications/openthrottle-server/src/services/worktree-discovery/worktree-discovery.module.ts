/**
 * @description On-disk discovery of the git worktrees belonging to a user's repositories, for
 * /settings/repositories. Read-only: nothing here creates, prunes or removes a worktree.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesServerModule } from '@openthrottle/nestjs-repositories-server';

import { WorktreeDiscoveryService } from './worktree-discovery.service.ts';

@Module({
  exports: [WorktreeDiscoveryService],
  imports: [LoggerModule, NestjsRepositoriesServerModule],
  providers: [WorktreeDiscoveryService],
})
export class WorktreeDiscoveryModule {}
