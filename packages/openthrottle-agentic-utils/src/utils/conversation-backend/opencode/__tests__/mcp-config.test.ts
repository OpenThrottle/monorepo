import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  translateManagedMcpToOpencode,
  writeOpencodeMcpConfig,
} from '../mcp-config.ts';

const MANAGED = {
  'openthrottle-mcp': {
    args: ['./scripts/run-openthrottle-mcp.sh'],
    command: 'bash',
    description: 'OpenThrottle MCP',
    env: {
      API_URL: 'http://localhost:6021',
      API_URL_INTERNAL: 'http://localhost:6021',
    },
  },
};

describe('translateManagedMcpToOpencode', () => {
  it('maps the canonical .mcp.json shape onto opencode local-server config', () => {
    const config = translateManagedMcpToOpencode(MANAGED);

    expect(config.$schema).toBe('https://opencode.ai/config.json');
    expect(config.mcp['openthrottle-mcp']).toEqual({
      command: ['bash', './scripts/run-openthrottle-mcp.sh'],
      enabled: true,
      environment: {
        API_URL: 'http://localhost:6021',
        API_URL_INTERNAL: 'http://localhost:6021',
      },
      type: 'local',
    });
  });

  it('omits environment when the managed server carries no env', () => {
    const config = translateManagedMcpToOpencode({
      fetch: { args: ['mcp-server-fetch'], command: 'uvx' },
    });

    expect(config.mcp['fetch']).toEqual({
      command: ['uvx', 'mcp-server-fetch'],
      enabled: true,
      type: 'local',
    });
  });

  it('skips servers whose command is not a string', () => {
    const config = translateManagedMcpToOpencode({
      broken: { args: ['x'] },
    });

    expect(config.mcp).toEqual({});
  });
});

describe('writeOpencodeMcpConfig', () => {
  it('writes a temp config outside any checkout and cleanup removes it', () => {
    const file = writeOpencodeMcpConfig(MANAGED);

    expect(file).not.toBeNull();
    if (file === null) {
      return;
    }
    expect(existsSync(file.path)).toBe(true);
    const written = JSON.parse(readFileSync(file.path, 'utf8'));
    expect(written.mcp['openthrottle-mcp'].command).toEqual([
      'bash',
      './scripts/run-openthrottle-mcp.sh',
    ]);

    file.cleanup();
    expect(existsSync(file.path)).toBe(false);
    // cleanup is idempotent.
    expect(() => file.cleanup()).not.toThrow();
  });

  it('returns null when there is nothing to inject', () => {
    expect(writeOpencodeMcpConfig({})).toBeNull();
    expect(writeOpencodeMcpConfig({ broken: { args: ['x'] } })).toBeNull();
  });
});
