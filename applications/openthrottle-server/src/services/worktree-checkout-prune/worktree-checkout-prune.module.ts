/**
 * @description Guarded deletion of stale worktree checkout rows. Rows only — never the filesystem.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorktreeCheckoutPruneService } from './worktree-checkout-prune.service.ts';

@Module({
  exports: [WorktreeCheckoutPruneService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [WorktreeCheckoutPruneService],
})
export class WorktreeCheckoutPruneModule {}
