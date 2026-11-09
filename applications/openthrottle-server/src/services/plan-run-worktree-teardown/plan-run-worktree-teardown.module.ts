/**
 * @description Guarded removal of the git worktree a programmatic plan run executed in, via the
 * ot-worktree destroy action (`destroy.sh`, resolved by path) — the mirror of
 * plan-run-worktree-provision.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanRunWorktreeTeardownService } from './plan-run-worktree-teardown.service.ts';

@Module({
  exports: [PlanRunWorktreeTeardownService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [PlanRunWorktreeTeardownService],
})
export class PlanRunWorktreeTeardownModule {}
