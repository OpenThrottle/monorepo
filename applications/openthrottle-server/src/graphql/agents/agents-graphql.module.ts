/**
 * @description GraphQL module for the agents chat surface. Imports {@link McpDeveloperModule} so resolvers can delegate to the in-process MCP developer stack in follow-up work.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpDeveloperModule } from '../../modules/mcp-developer/mcp-developer.module';
import { AgentsMcpRouterLlmService } from './agents-mcp-router-llm.service';
import { AgentsMcpRouter } from './agents-mcp-router';
import { AgentsResolver } from './agents.resolver';

@Module({
  imports: [ConfigModule, McpDeveloperModule],
  providers: [AgentsMcpRouter, AgentsMcpRouterLlmService, AgentsResolver],
})
export class AgentsGraphqlModule {}
