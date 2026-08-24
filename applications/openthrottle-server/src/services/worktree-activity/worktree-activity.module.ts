/**
 * @description Activity classification (RUNNING / DIRTY / IDLE) for discovered worktrees.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { WorktreeDiscoveryModule } from '../worktree-discovery/worktree-discovery.module';
import { WorktreeActivityService } from './worktree-activity.service';

@Module({
  exports: [WorktreeActivityService],
  imports: [LoggerModule, NestjsRepositoriesModule, WorktreeDiscoveryModule],
  providers: [WorktreeActivityService],
})
export class WorktreeActivityModule {}
