import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { bootstrapMcpDeveloperApp, McpTransportType } from './nest/index.ts';
import {
  getServerName,
  SERVER_INSTRUCTIONS,
  SERVER_VERSION,
} from './config/index.ts';
import {
  captureCallerWorkspacePath,
  resolveStdioWorkspacePath,
} from './config/workspace-path.ts';
import { captureClientIdentityProvider } from './config/client-identity.ts';
import { captureStdioExecutionBackend } from './config/execution-backend.ts';
import { registerKnowledgeBaseResource } from './nest-tool-handlers.ts';
import { registerDeveloperMcpTools } from './tool-registry.ts';
import type { NestjsMcpDeveloperBootstrapOptions } from './nest/index.ts';

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

/**
 * @description Non-fatal startup check for `runServerLocal`. The stdio server boots
 * fine without `OPENTHROTTLE_MCP_AUTH_TOKEN` (unauthenticated tools like `health` and
 * `discover_local_models` still work), so this is a warning rather than a hard fail —
 * it surfaces the missing/empty token at boot instead of leaving the first
 * authenticated tool call to throw "Auth token required" (see AUTH.md). Logged to
 * stderr only; stdout is reserved for the MCP protocol on stdio transports.
 */
function warnIfAuthTokenMissing(): void {
  const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    console.error(
      '[openthrottle-mcp] OPENTHROTTLE_MCP_AUTH_TOKEN is not set. Unauthenticated tools (health, discover_local_models) will work, but every authenticated tool call will fail with "Auth token required". Set OPENTHROTTLE_MCP_AUTH_TOKEN in the MCP server env to enable them.',
    );
  }
}

export async function runServerLocal(): Promise<void> {
  warnIfAuthTokenMissing();

  // Stdio ONLY: on the HTTP surface this process is the server, so its cwd is not a caller's
  // workspace. Capturing here rather than at module load keeps that path out of the Nest surface.
  captureCallerWorkspacePath(resolveStdioWorkspacePath());

  // Stdio ONLY, for the same reason: on the HTTP surface the environment describes the
  // SERVER, not the caller, so detecting there would report the same wrong backend for
  // every request — worse than an agent's declared guess, because it cannot be overridden.
  captureStdioExecutionBackend();

  const server = new McpServer(
    { name: getServerName(), version: SERVER_VERSION },
    {
      capabilities: { resources: {}, tools: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // Read through a callback, not eagerly: the client's Implementation only exists once the
  // initialize handshake completes, which is after connect() below returns.
  captureClientIdentityProvider(() => {
    const client = server.server.getClientVersion();
    return client == null
      ? null
      : { name: client.name, version: client.version };
  });

  registerDeveloperMcpTools(server);
  registerKnowledgeBaseResource(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
