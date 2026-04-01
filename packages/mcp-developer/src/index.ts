/**
 * @description MCP developer package: tool registrations for Cortex/OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerKnowledgeBaseResource } from './resources/knowledge-base.js';
import { getServerName, SERVER_VERSION } from './config/index.js';
import {
  registerActivityTools,
  registerCommitTools,
  registerHealthTool,
  registerNoteTools,
  registerOutputTools,
  registerPlanTools,
  registerSearchTools,
  registerTaskTools,
} from './tools/index.js';

/**
 * @description Starts the MCP server on stdio. Used by the CLI bin and by `nx run mattscholta-ai-mcp:serve`.
 */
export async function runServer(): Promise<void> {
  const server = new McpServer(
    { name: getServerName(), version: SERVER_VERSION },
    { capabilities: { resources: {}, tools: {} } },
  );

  registerActivityTools(server);
  registerCommitTools(server);
  registerHealthTool(server);
  registerKnowledgeBaseResource(server);
  registerNoteTools(server);
  registerOutputTools(server);
  registerPlanTools(server);
  registerSearchTools(server);
  registerTaskTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
