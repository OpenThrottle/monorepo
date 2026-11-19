/**
 * @description Guarded deletion of stale worktree checkout rows. Rows only — never the filesystem.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  NestjsRepositoriesServerModule,
  PlanRunsModule,
  WorktreeRemovalsModule,
} from '@openthrottle/nestjs-repositories-server';

import { WorktreeCheckoutPruneService } from './worktree-checkout-prune.service.ts';

@Module({
  exports: [WorktreeCheckoutPruneService],
  imports: [
    LoggerModule,
    NestjsRepositoriesServerModule,
    PlanRunsModule,
    WorktreeRemovalsModule,
  ],
  providers: [WorktreeCheckoutPruneService],
})
export class WorktreeCheckoutPruneModule {}
