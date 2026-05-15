import { getServerName, SERVER_VERSION } from './config/index.js';
import { bootstrapMcpDeveloperApp, McpTransportType } from './nest/index.js';
import type { NestjsMcpDeveloperBootstrapOptions } from './nest/index.js';

/**
 * @description Starts the MCP server on stdio via `@rekog/mcp-nest` and the developer Nest MCP module. Used by the CLI bin and `nx run @openthrottle/mcp-developer:serve`.
 */
export async function runServer(): Promise<void> {
  const options: NestjsMcpDeveloperBootstrapOptions = {
    capabilities: { resources: {}, tools: {} },
    name: getServerName(),
    transport: McpTransportType.STDIO,
    version: SERVER_VERSION,
  };
  await bootstrapMcpDeveloperApp(options);
}
