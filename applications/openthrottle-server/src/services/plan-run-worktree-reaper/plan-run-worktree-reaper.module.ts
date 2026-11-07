/**
 * @description The backstop sweep that nominates stale plan-run worktrees for guarded teardown.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlanRunWorktreeTeardownModule } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.module.ts';
import { WorktreeDiscoveryModule } from '../worktree-discovery/worktree-discovery.module.ts';
import { PlanRunWorktreeReaperService } from './plan-run-worktree-reaper.service.ts';

@Module({
  exports: [PlanRunWorktreeReaperService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanRunWorktreeTeardownModule,
    WorktreeDiscoveryModule,
  ],
  providers: [PlanRunWorktreeReaperService],
})
export class PlanRunWorktreeReaperModule {}
