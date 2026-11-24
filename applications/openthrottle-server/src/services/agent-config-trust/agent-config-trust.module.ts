/**
 * @description Resolves a directory's agent-config trust for launchers that spawn in a checkout
 * directly (scheduled agent jobs). Plan runs resolve theirs in `PlanRunWorkspaceService`.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsModule } from '@openthrottle/nestjs-repositories-server';

import { AgentConfigTrustService } from './agent-config-trust.service.ts';

@Module({
  exports: [AgentConfigTrustService],
  imports: [LoggerModule, RepositoryCheckoutsModule],
  providers: [AgentConfigTrustService],
})
export class AgentConfigTrustModule {}
