/**
 * @description MCP server for plans knowledge base (semantic search over Cortex Postgres).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getServerName, SERVER_VERSION } from './constants.ts';
import { destroyDataSources } from './data-source.ts';
import { registerKnowledgeBaseResource } from './resources/knowledge-base.ts';
import {
  registerActivityTools,
  registerCommitTools,
  registerHealthTool,
  registerNoteTools,
  registerOutputTools,
  registerPlanTools,
  registerSearchTools,
  registerTaskTools,
} from './tools/index.ts';

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

  // Shutdown hook: release pooled Postgres connections held by cached DataSources so the
  // long-lived stdio process doesn't hold connections open per connection string forever.
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    void destroyDataSources().finally(() => {
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
