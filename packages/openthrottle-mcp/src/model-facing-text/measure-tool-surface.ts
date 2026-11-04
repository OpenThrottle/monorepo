/**
 * @description Measures the model-facing text the stdio MCP server injects into every client session: the
 * server `instructions` block and each tool's wire entry (name + description + JSON input schema) exactly as a
 * client receives it from `tools/list`. Measured through an in-process client over a linked in-memory
 * transport, so the bytes are the serialized protocol payload rather than an approximation of it.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SERVER_INSTRUCTIONS, SERVER_VERSION } from '../config/index.ts';
import { registerDeveloperMcpTools } from '../tool-registry.ts';

/**
 * @description Byte counts for one tool's `tools/list` entry.
 */
export interface ToolTextMeasurement {
  readonly descriptionBytes: number;
  readonly name: string;
  readonly schemaBytes: number;
  readonly totalBytes: number;
}

/**
 * @description Byte counts for the whole stdio MCP surface.
 */
export interface ToolSurfaceMeasurement {
  readonly instructionsBytes: number;
  readonly tools: readonly ToolTextMeasurement[];
  readonly toolsTotalBytes: number;
}

const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8');

/**
 * @description Boots the stdio tool registry on an in-memory transport, lists its tools, and measures them.
 * Tools are sorted by name so the output diffs cleanly.
 * @public
 */
export async function measureToolSurface(): Promise<ToolSurfaceMeasurement> {
  const server = new McpServer(
    { name: 'openthrottle-mcp-measure', version: SERVER_VERSION },
    {
      capabilities: { resources: {}, tools: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );
  registerDeveloperMcpTools(server);

  const client = new Client({ name: 'measure', version: SERVER_VERSION });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    const { tools } = await client.listTools();
    const measured = tools
      .map((tool): ToolTextMeasurement => {
        const descriptionBytes = byteLength(tool.description ?? '');
        const schemaBytes = byteLength(JSON.stringify(tool.inputSchema));

        return {
          descriptionBytes,
          name: tool.name,
          schemaBytes,
          totalBytes: byteLength(JSON.stringify(tool)),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      instructionsBytes: byteLength(client.getInstructions() ?? ''),
      tools: measured,
      toolsTotalBytes: measured.reduce((sum, t) => sum + t.totalBytes, 0),
    };
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}
