/**
 * @description The after-run policy for a plan run's worktree: whether to tear it down, and the one
 * plan_output line saying what happened.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanRunWorktreeTeardownModule } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.module.ts';
import { PlanRunWorktreeCleanupService } from './plan-run-worktree-cleanup.service.ts';

@Module({
  exports: [PlanRunWorktreeCleanupService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRunWorktreeTeardownModule,
  ],
  providers: [PlanRunWorktreeCleanupService],
})
export class PlanRunWorktreeCleanupModule {}
