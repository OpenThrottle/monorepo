/**
 * @description Creation of the git worktree a programmatic plan run executes in, via the
 * ot-worktree create action (`create.sh`, resolved by path — never a pnpm script).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlanRunWorktreeProvisionService } from './plan-run-worktree-provision.service.ts';

@Module({
  exports: [PlanRunWorktreeProvisionService],
  imports: [LoggerModule],
  providers: [PlanRunWorktreeProvisionService],
})
export class PlanRunWorktreeProvisionModule {}
