import { Module } from '@nestjs/common';
import {
  AgentAccountsModule,
  AgentTokenUsageModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentAccountStampingModule } from '../../services/agent-account-stamping/agent-account-stamping.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TokenUsageResolver } from './token-usage.resolver.ts';

/**
 * @description GraphQL module for user-scoped token usage. Imports
 * AgentTokenUsageModule for AgentTokenUsageRepository and
 * RolesModule for the permissions guard, and
 * EffectiveUserResolutionModule so ingest can attribute rows to the human user
 * its authenticated principal acts as.
 */
@Module({
  imports: [
    AgentAccountsModule,
    AgentAccountStampingModule,
    AgentTokenUsageModule,
    EffectiveUserResolutionModule,
    RolesModule,
  ],
  providers: [TokenUsageResolver],
})
export class TokenUsageGraphqlModule {}
