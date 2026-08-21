/**
 * @description Run-start checks that the plan run's directory can actually reach its MCP servers.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanRunWorkspacePreflightService } from './plan-run-workspace-preflight.service';

@Module({
  exports: [PlanRunWorkspacePreflightService],
  imports: [LoggerModule],
  providers: [PlanRunWorkspacePreflightService],
})
export class PlanRunWorkspacePreflightModule {}
