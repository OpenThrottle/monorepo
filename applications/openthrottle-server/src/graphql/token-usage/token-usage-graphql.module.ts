import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { TokenUsageResolver } from './token-usage.resolver';

/**
 * @description GraphQL module for user-scoped token usage. Imports
 * NestjsRepositoriesModule for AgentTokenUsageService.
 */
@Module({
  imports: [NestjsRepositoriesModule],
  providers: [TokenUsageResolver],
})
export class TokenUsageGraphqlModule {}
