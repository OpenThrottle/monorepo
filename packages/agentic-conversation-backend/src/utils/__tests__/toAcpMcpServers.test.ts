import { describe, expect, it } from 'vitest';

import { toAcpMcpServers } from '../toAcpMcpServers.ts';

describe('toAcpMcpServers', () => {
  it('converts stdio servers and merges the run mcpEnv into their env', () => {
    const servers = toAcpMcpServers({
      mcpEnv: { OT_TOKEN: 'secret' },
      mcpServers: {
        openthrottle: {
          args: ['serve'],
          command: 'ot-mcp',
          env: { MODE: 'stdio' },
        },
      },
    });

    expect(servers).toEqual([
      {
        args: ['serve'],
        command: 'ot-mcp',
        env: [
          { name: 'OT_TOKEN', value: 'secret' },
          { name: 'MODE', value: 'stdio' },
        ],
        name: 'openthrottle',
      },
    ]);
  });

  it('converts http servers and drops entries it cannot express', () => {
    const servers = toAcpMcpServers({
      mcpEnv: undefined,
      mcpServers: {
        broken: { description: 'no transport' },
        remote: {
          headers: { Authorization: 'Bearer x' },
          url: 'https://mcp.example/mcp',
        },
      },
    });

    expect(servers).toEqual([
      {
        headers: [{ name: 'Authorization', value: 'Bearer x' }],
        name: 'remote',
        type: 'http',
        url: 'https://mcp.example/mcp',
      },
    ]);
  });
});
