/**
 * @description MCP server for documentation search (semantic search over docs/ ingested into Cortex).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getServerName, SERVER_VERSION } from './constants.js';
import { registerSearchTools } from './tools/search.js';

/**
 * @description Starts the MCP server on stdio. Used by the CLI bin and by:
 *
 *    nx run mattscholta-docs-mcp:serve
 */
export async function runServer(): Promise<void> {
  const server = new McpServer(
    { name: getServerName(), version: SERVER_VERSION },
    { capabilities: { resources: {}, tools: {} } },
  );

  registerSearchTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
