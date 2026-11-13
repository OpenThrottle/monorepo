/**
 * @description Lists the model-facing text the stdio MCP server injects into every client session: the server
 * `instructions` block and each tool's wire entry (name + description + JSON input schema) exactly as a client
 * receives it from `tools/list`, for a given toolset selection. Read through an in-process client over a linked in-memory transport, so the
 * result is the serialized protocol payload rather than an approximation of it. Shared by the byte-budget
 * measurement and the tool-selection evals, so both see the same surface.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { buildServerInstructions, SERVER_VERSION } from '../config/index.ts';
import type { ToolsetName } from '../config/toolsets.ts';
import { registerDeveloperMcpTools } from '../tool-registry.ts';

/**
 * @description The stdio MCP surface as a client sees it. Tools are sorted by name so output diffs cleanly.
 */
export interface ToolSurface {
  readonly instructions: string;
  readonly tools: readonly Tool[];
}

/**
 * @description Boots the stdio tool registry serving `toolsets` on an in-memory transport and lists its
 * instructions and tools.
 * @public
 */
export async function listToolSurface(
  toolsets: ReadonlySet<ToolsetName>,
): Promise<ToolSurface> {
  const server = new McpServer(
    { name: 'openthrottle-mcp-surface', version: SERVER_VERSION },
    {
      capabilities: { resources: {}, tools: {} },
      instructions: buildServerInstructions(toolsets),
    },
  );
  registerDeveloperMcpTools(server, toolsets);

  const client = new Client({ name: 'surface', version: SERVER_VERSION });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    const { tools } = await client.listTools();

    return {
      instructions: client.getInstructions() ?? '',
      tools: [...tools].sort((a, b) => a.name.localeCompare(b.name)),
    };
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}
