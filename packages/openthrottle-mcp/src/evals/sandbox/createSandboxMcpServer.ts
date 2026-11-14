/**
 * @description A sandboxed MCP server for CLI-driven evals. It serves a {@link ToolSurface} verbatim — the same
 * instructions block and the same `tools/list` entries (name, description, raw JSON input schema) a client gets
 * from the real stdio server — but never executes anything: each `tools/call` is handed to `recordCall` and
 * answered with a fixed success payload. Nothing here reaches GraphQL, so a CLI pointed at it cannot create,
 * update or delete a real plan or task.
 *
 * It is built on the low-level `Server` rather than `McpServer` on purpose: `McpServer` re-derives each input
 * schema from a zod shape, while the surface already holds the serialized JSON schema, and re-deriving it would
 * be the one place the sandbox could drift from the real wire payload.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ToolSurface } from '../../model-facing-text/surface.ts';

/**
 * @description One `tools/call` the sandbox received, as written to the call log.
 */
export interface SandboxToolCall {
  readonly args: Readonly<Record<string, unknown>>;
  readonly tool: string;
  readonly ts: string;
}

/**
 * @description Inputs for {@link createSandboxMcpServer}.
 */
export interface CreateSandboxMcpServerOptions {
  readonly name: string;
  readonly now: () => Date;
  readonly recordCall: (call: SandboxToolCall) => void;
  readonly surface: ToolSurface;
  readonly version: string;
}

/**
 * @description The fixed payload every sandboxed tool answers with. `sandbox: true` lets a transcript reader
 * tell a canned reply from a real one.
 * @public
 */
export function sandboxReplyFor(tool: string): CallToolResult {
  return {
    content: [
      {
        text: JSON.stringify({ ok: true, sandbox: true, tool }),
        type: 'text',
      },
    ],
  };
}

/**
 * @description Builds (does not connect) a sandbox server serving `surface`. An unknown tool name is still
 * recorded — a model calling a tool that does not exist is itself an eval signal — and answered with an error.
 * @public
 */
export function createSandboxMcpServer(
  options: CreateSandboxMcpServerOptions,
): Server {
  const { name, now, recordCall, surface, version } = options;
  const known = new Set(surface.tools.map((tool) => tool.name));
  const server = new Server(
    { name, version },
    {
      capabilities: { tools: {} },
      instructions: surface.instructions,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return { tools: [...surface.tools] };
  });

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = request.params.name;
    recordCall({
      args: request.params.arguments ?? {},
      tool,
      ts: now().toISOString(),
    });
    if (!known.has(tool)) {
      return {
        content: [{ text: `Unknown tool: ${tool}`, type: 'text' }],
        isError: true,
      };
    }

    return sandboxReplyFor(tool);
  });

  return server;
}
