import { Module } from '@nestjs/common';
import type { AgentAccountResolver } from '@openthrottle/agentic-conversation-backend';
import {
  createAgentAccountResolver,
  defaultAgentAccountResolverDeps,
} from '@openthrottle/agentic-conversation-backend';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgentAccountsModule } from '@openthrottle/nestjs-repositories-server';

import { AGENT_ACCOUNT_RESOLVER } from './agent-account-stamping.constants.ts';
import { AgentAccountStampingService } from './agent-account-stamping.service.ts';

/**
 * @description Agent-account stamping for usage writers (chat persistence and hook ingest).
 */
@Module({
  exports: [AgentAccountStampingService],
  imports: [AgentAccountsModule, LoggerModule],
  providers: [
    AgentAccountStampingService,
    {
      provide: AGENT_ACCOUNT_RESOLVER,
      useFactory: (): AgentAccountResolver => {
        return createAgentAccountResolver(defaultAgentAccountResolverDeps());
      },
    },
  ],
})
export class AgentAccountStampingModule {}
