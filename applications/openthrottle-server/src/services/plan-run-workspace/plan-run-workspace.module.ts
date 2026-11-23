/**
 * @description Shared run-start workspace setup for the OT Loop plan runner:
 * worktree provisioning, checkout registration, snapshot rewrite, MCP preflight, foreign-skill
 * injection and config load.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamModule,
  PlanRunsModule,
  RepositoryCheckoutsModule,
} from '@openthrottle/nestjs-repositories-server';

import { ForeignSkillInjectionModule } from '../foreign-skill-injection/foreign-skill-injection.module.ts';
import { PlanRunWorkspacePreflightModule } from '../plan-run-workspace-preflight/plan-run-workspace-preflight.module.ts';
import { PlanRunWorktreeCheckoutModule } from '../plan-run-worktree-checkout/plan-run-worktree-checkout.module.ts';
import { PlanRunWorktreeProvisionModule } from '../plan-run-worktree-provision/plan-run-worktree-provision.module.ts';
import { PlanRunWorkspaceService } from './plan-run-workspace.service.ts';

@Module({
  exports: [PlanRunWorkspaceService],
  imports: [
    ForeignSkillInjectionModule,
    LoggerModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlanRunWorkspacePreflightModule,
    PlanRunWorktreeCheckoutModule,
    PlanRunWorktreeProvisionModule,
    RepositoryCheckoutsModule,
  ],
  providers: [PlanRunWorkspaceService],
})
export class PlanRunWorkspaceModule {}
