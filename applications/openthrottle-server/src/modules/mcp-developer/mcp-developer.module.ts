import { Module } from '@nestjs/common';
import {
  McpTransportType,
  NestjsMcpDeveloperModule,
} from '@openthrottle/nestjs-openthrottle-mcp';

/**
 * @description Registers {@link NestjsMcpDeveloperModule} in-process so GraphQL (and HTTP MCP clients) can reach the same developer MCP tool surface as stdio `openthrottle-mcp`.
 */
@Module({
  exports: [NestjsMcpDeveloperModule],
  imports: [
    NestjsMcpDeveloperModule.forRoot({
      apiPrefix: 'openthrottle-developer-mcp',
      capabilities: { resources: {}, tools: {} },
      description: `OpenThrottle developer MCP tools backed by this server’s GraphQL API.`,
      name: 'openthrottle-openthrottle-mcp',
      title: 'OpenThrottle Developer MCP',
      transport: McpTransportType.STREAMABLE_HTTP,
      version: '1.0.0',
    }),
  ],
})
export class McpDeveloperModule {}
