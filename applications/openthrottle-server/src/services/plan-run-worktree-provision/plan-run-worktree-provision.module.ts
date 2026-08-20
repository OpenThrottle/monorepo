/**
 * @description Creation of the git worktree a programmatic plan run executes in, via
 * `pnpm run worktree:new`.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanRunWorktreeProvisionService } from './plan-run-worktree-provision.service';

@Module({
  exports: [PlanRunWorktreeProvisionService],
  imports: [LoggerModule],
  providers: [PlanRunWorktreeProvisionService],
})
export class PlanRunWorktreeProvisionModule {}
