import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import type { AgentAccountResolver } from '@openthrottle/openthrottle-agentic-utils';
import {
  createAgentAccountResolver,
  defaultAgentAccountResolverDeps,
} from '@openthrottle/openthrottle-agentic-utils';

import { AGENT_ACCOUNT_RESOLVER } from './agent-account-stamping.constants.ts';
import { AgentAccountStampingService } from './agent-account-stamping.service.ts';

/**
 * @description Agent-account stamping for usage writers (chat persistence and hook ingest).
 */
@Module({
  exports: [AgentAccountStampingService],
  imports: [LoggerModule, NestjsRepositoriesModule],
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
