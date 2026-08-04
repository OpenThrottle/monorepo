/**
 * @description Soft-fail registration of linked git worktrees onto
 * `repository_checkouts` + back-fill of `plan_runs.checkout_id` at run start.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RepositoryInspectionModule } from '../../graphql/repository-inspection/repository-inspection.module';
import { PlanRunWorktreeCheckoutService } from './plan-run-worktree-checkout.service';

@Module({
  exports: [PlanRunWorktreeCheckoutService],
  imports: [LoggerModule, NestjsRepositoriesModule, RepositoryInspectionModule],
  providers: [PlanRunWorktreeCheckoutService],
})
export class PlanRunWorktreeCheckoutModule {}
