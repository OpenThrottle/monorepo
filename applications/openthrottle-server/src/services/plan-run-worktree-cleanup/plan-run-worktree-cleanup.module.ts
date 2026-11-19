/**
 * @description The after-run policy for a plan run's worktree: whether to tear it down, and the one
 * plan_output line saying what happened.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamModule,
  PlansModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanRunWorktreeTeardownModule } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.module.ts';
import { PlanRunWorktreeCleanupService } from './plan-run-worktree-cleanup.service.ts';

@Module({
  exports: [PlanRunWorktreeCleanupService],
  imports: [
    LoggerModule,
    PlanOutputStreamModule,
    PlanRunWorktreeTeardownModule,
    PlansModule,
  ],
  providers: [PlanRunWorktreeCleanupService],
})
export class PlanRunWorktreeCleanupModule {}
