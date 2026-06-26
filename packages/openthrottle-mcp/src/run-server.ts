import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { bootstrapMcpDeveloperApp, McpTransportType } from './nest/index.js';
import {
  getServerName,
  SERVER_INSTRUCTIONS,
  SERVER_VERSION,
} from './config/index.js';
import { registerKnowledgeBaseResource } from './nest-tool-handlers.js';
import { registerDeveloperMcpTools } from './tool-registry.js';
import type { NestjsMcpDeveloperBootstrapOptions } from './nest/index.js';

/**
 * @description Starts the MCP server on stdio via `@rekog/mcp-nest` and the developer Nest MCP module. Used by the CLI bin and `nx run @openthrottle/openthrottle-mcp:serve`.
 */
export async function runServer(): Promise<void> {
  const options: NestjsMcpDeveloperBootstrapOptions = {
    capabilities: { resources: {}, tools: {} },
    instructions: SERVER_INSTRUCTIONS,
    name: getServerName(),
    transport: McpTransportType.STDIO,
    version: SERVER_VERSION,
  };

  await bootstrapMcpDeveloperApp(options);
}

export async function runServerLocal(): Promise<void> {
  const server = new McpServer(
    { name: getServerName(), version: SERVER_VERSION },
    {
      capabilities: { resources: {}, tools: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerDeveloperMcpTools(server);
  registerKnowledgeBaseResource(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
