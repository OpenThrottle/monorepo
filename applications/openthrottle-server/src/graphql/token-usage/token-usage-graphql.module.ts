import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
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
