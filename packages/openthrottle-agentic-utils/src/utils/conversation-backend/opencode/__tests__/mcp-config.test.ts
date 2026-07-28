import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  translateManagedMcpToOpencode,
  writeOpencodeMcpConfig,
} from '../mcp-config.ts';
import { CONVERSATION_PERMISSION_MODES } from '../../types.ts';

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
    expect(config.mcp?.['openthrottle-mcp']).toEqual({
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

    expect(config.mcp?.['fetch']).toEqual({
      command: ['uvx', 'mcp-server-fetch'],
      enabled: true,
      type: 'local',
    });
  });

  it('omits the mcp key entirely when no server has a string command', () => {
    const config = translateManagedMcpToOpencode({
      broken: { args: ['x'] },
    });

    expect(config.mcp).toBeUndefined();
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

describe('translateManagedMcpToOpencode — permission slice', () => {
  it('default (no mode): scopes an allow to the injected MCP servers, no edit allow', () => {
    const config = translateManagedMcpToOpencode(MANAGED);

    expect(config.permission).toEqual({ 'openthrottle-mcp*': 'allow' });
  });

  it('supervised: same scoped allow as the default', () => {
    const config = translateManagedMcpToOpencode(
      MANAGED,
      CONVERSATION_PERMISSION_MODES.supervised,
    );

    expect(config.permission).toEqual({ 'openthrottle-mcp*': 'allow' });
  });

  it('autoAcceptEdits: allows edit plus the scoped MCP grant', () => {
    const config = translateManagedMcpToOpencode(
      MANAGED,
      CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
    );

    expect(config.permission).toEqual({
      edit: 'allow',
      'openthrottle-mcp*': 'allow',
    });
  });

  it('fullAccess: writes no permission slice (handled by --auto)', () => {
    const config = translateManagedMcpToOpencode(
      MANAGED,
      CONVERSATION_PERMISSION_MODES.fullAccess,
    );

    expect(config.permission).toBeUndefined();
  });

  it('supervised/default with no servers: no permission slice', () => {
    expect(translateManagedMcpToOpencode({}).permission).toBeUndefined();
  });

  it('autoAcceptEdits with no servers: still allows edit', () => {
    const config = translateManagedMcpToOpencode(
      {},
      CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
    );

    expect(config.permission).toEqual({ edit: 'allow' });
  });
});

describe('writeOpencodeMcpConfig — permission slice', () => {
  it('writes the scoped MCP permission into the temp config for the default posture', () => {
    const file = writeOpencodeMcpConfig(MANAGED);

    expect(file).not.toBeNull();
    if (file === null) {
      return;
    }
    const written = JSON.parse(readFileSync(file.path, 'utf8'));
    expect(written.permission).toEqual({ 'openthrottle-mcp*': 'allow' });
    file.cleanup();
  });

  it('writes a config for autoAcceptEdits even with no MCP servers', () => {
    const file = writeOpencodeMcpConfig(
      {},
      CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
    );

    expect(file).not.toBeNull();
    if (file === null) {
      return;
    }
    const written = JSON.parse(readFileSync(file.path, 'utf8'));
    expect(written.mcp).toBeUndefined();
    expect(written.permission).toEqual({ edit: 'allow' });
    file.cleanup();
  });

  it('returns null for fullAccess with no MCP servers (--auto covers it)', () => {
    expect(
      writeOpencodeMcpConfig({}, CONVERSATION_PERMISSION_MODES.fullAccess),
    ).toBeNull();
  });
});
