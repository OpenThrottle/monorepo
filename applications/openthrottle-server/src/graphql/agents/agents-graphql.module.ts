/**
 * @description GraphQL module for the agents chat surface. Imports {@link McpDeveloperModule} so resolvers can delegate to the in-process MCP developer stack in follow-up work.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { McpDeveloperModule } from '../../modules/mcp-developer/mcp-developer.module.ts';
import { AgentsResolver } from './agents.resolver.ts';
import { AgentsMcpRouter } from './agents-mcp-router.ts';
import { AgentsMcpRouterLlmService } from './agents-mcp-router-llm.service.ts';

@Module({
  imports: [ConfigModule, McpDeveloperModule, NestjsRepositoriesModule],
  providers: [AgentsMcpRouter, AgentsMcpRouterLlmService, AgentsResolver],
})
export class AgentsGraphqlModule {}
