/**
 * @description Soft-fail registration of linked git worktrees onto
 * `repository_checkouts` + write of `plan_runs.checkout_id`/`branch` at run start.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { RepositoryInspectionModule } from '../../graphql/repository-inspection/repository-inspection.module.ts';
import { PlanRunWorktreeCheckoutService } from './plan-run-worktree-checkout.service.ts';

@Module({
  exports: [PlanRunWorktreeCheckoutService],
  imports: [LoggerModule, NestjsRepositoriesModule, RepositoryInspectionModule],
  providers: [PlanRunWorktreeCheckoutService],
})
export class PlanRunWorktreeCheckoutModule {}
