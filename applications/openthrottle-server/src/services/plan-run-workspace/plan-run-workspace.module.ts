/**
 * @description Shared run-start workspace setup for the in-process plan runners (Ralph and OT Loop):
 * worktree provisioning, checkout registration, snapshot rewrite, MCP preflight, foreign-skill
 * injection and config load.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  PlanOutputStreamModule,
  PlanRunsModule,
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
    NestjsRepositoriesModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlanRunWorkspacePreflightModule,
    PlanRunWorktreeCheckoutModule,
    PlanRunWorktreeProvisionModule,
  ],
  providers: [PlanRunWorkspaceService],
})
export class PlanRunWorkspaceModule {}
