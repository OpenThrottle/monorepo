/**
 * @description Activity classification (RUNNING / DIRTY / IDLE) for discovered worktrees.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanRunsModule } from '@openthrottle/nestjs-repositories-server';

import { WorktreeDiscoveryModule } from '../worktree-discovery/worktree-discovery.module.ts';
import { WorktreeActivityService } from './worktree-activity.service.ts';

@Module({
  exports: [WorktreeActivityService],
  imports: [LoggerModule, PlanRunsModule, WorktreeDiscoveryModule],
  providers: [WorktreeActivityService],
})
export class WorktreeActivityModule {}
