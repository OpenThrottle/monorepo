/**
 * @description GraphQL module for the agents chat surface. Imports {@link McpDeveloperModule} so resolvers can delegate to the in-process MCP developer stack in follow-up work.
 */

import { Module } from '@nestjs/common';
import { McpDeveloperModule } from '../../modules/mcp-developer/mcp-developer.module';
import { AgentsResolver } from './agents.resolver';

@Module({
  imports: [McpDeveloperModule],
  providers: [AgentsResolver],
})
export class AgentsGraphqlModule {}
