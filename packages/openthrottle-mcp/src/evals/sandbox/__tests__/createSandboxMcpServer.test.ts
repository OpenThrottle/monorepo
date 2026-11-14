import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TOOLSET_NAMES } from '../../../config/toolsets.ts';
import type { ToolSurface } from '../../../model-facing-text/surface.ts';
import { listToolSurface } from '../../../model-facing-text/surface.ts';
import { surfaceSha256 } from '../../tool-selection/runEvals.ts';
import type { SandboxToolCall } from '../createSandboxMcpServer.ts';
import {
  createSandboxMcpServer,
  sandboxReplyFor,
} from '../createSandboxMcpServer.ts';

interface Connected {
  readonly calls: SandboxToolCall[];
  readonly client: Client;
  readonly close: () => Promise<void>;
}

const FIXED_NOW = new Date('2026-11-13T12:00:00.000Z');

const connect = async (surface: ToolSurface): Promise<Connected> => {
  const calls: SandboxToolCall[] = [];
  const server = createSandboxMcpServer({
    name: 'openthrottle-mcp',
    now: () => FIXED_NOW,
    recordCall: (call) => {
      calls.push(call);
    },
    surface,
    version: '0.0.0-test',
  });
  const client = new Client({ name: 'sandbox-test', version: '0.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    calls,
    client,
    close: async () => {
      await Promise.all([client.close(), server.close()]);
    },
  };
};

describe('createSandboxMcpServer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves a surface whose hash equals the real full surface', async () => {
    const real = await listToolSurface(new Set(TOOLSET_NAMES));
    const sandbox = await connect(real);
    try {
      const { tools } = await sandbox.client.listTools();
      const served: ToolSurface = {
        instructions: sandbox.client.getInstructions() ?? '',
        tools: [...tools].sort((a, b) => a.name.localeCompare(b.name)),
      };

      expect(served.tools.length).toBeGreaterThan(0);
      expect(surfaceSha256(served)).toBe(surfaceSha256(real));
    } finally {
      await sandbox.close();
    }
  });

  it('records each call and answers with the canned payload, without any network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const real = await listToolSurface(new Set(TOOLSET_NAMES));
    const sandbox = await connect(real);
    try {
      const args = { title: 'Ship it' };
      const result = await sandbox.client.callTool({
        arguments: args,
        name: 'create_plan',
      });

      expect(result).toEqual(sandboxReplyFor('create_plan'));
      expect(sandbox.calls).toEqual([
        { args, tool: 'create_plan', ts: FIXED_NOW.toISOString() },
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      await sandbox.close();
    }
  });

  it('records an unknown tool and answers with an error', async () => {
    const sandbox = await connect({ instructions: 'x', tools: [] });
    try {
      const result = await sandbox.client.callTool({
        arguments: {},
        name: 'no_such_tool',
      });

      expect(result.isError).toBe(true);
      expect(sandbox.calls.map((call) => call.tool)).toEqual(['no_such_tool']);
    } finally {
      await sandbox.close();
    }
  });
});
