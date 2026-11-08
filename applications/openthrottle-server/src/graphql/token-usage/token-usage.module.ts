import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TokenUsageResolver } from './token-usage.resolver.ts';

/**
 * @description GraphQL module for user-scoped token usage. Imports
 * NestjsRepositoriesModule for AgentTokenUsageService and
 * EffectiveUserResolutionModule so ingest can attribute rows to the human user
 * its authenticated principal acts as.
 */
@Module({
  imports: [EffectiveUserResolutionModule, NestjsRepositoriesModule],
  providers: [TokenUsageResolver],
})
export class TokenUsageGraphqlModule {}
