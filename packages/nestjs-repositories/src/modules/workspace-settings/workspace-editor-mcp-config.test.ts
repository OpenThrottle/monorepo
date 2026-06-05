import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, test } from 'vitest';
import {
  buildManagedMcpServers,
  mergeManagedMcpServers,
} from './workspace-editor-mcp-config';

describe('mergeManagedMcpServers', () => {
  test('preserves unrelated servers and merges managed entries', () => {
    const merged = mergeManagedMcpServers(
      {
        mcpServers: {
          fetch: { args: [], command: 'docker' },
          'openthrottle-mcp': { command: 'old' },
        },
      },
      {
        'openthrottle-mcp': {
          args: ['./scripts/run-openthrottle-mcp.sh'],
          command: 'bash',
        },
      },
    );

    expect(merged.mcpServers?.fetch).toEqual({ args: [], command: 'docker' });
    expect(merged.mcpServers?.['openthrottle-mcp']).toEqual({
      args: ['./scripts/run-openthrottle-mcp.sh'],
      command: 'bash',
    });
  });
});

describe('buildManagedMcpServers', () => {
  test('returns openthrottle-mcp when run script exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'ot-editor-config-'));
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(
      join(root, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/bash\n',
    );

    const servers = buildManagedMcpServers({
      apiBaseUrl: 'http://localhost:6021',
      repositoryRoot: root,
    });

    expect(servers['openthrottle-mcp']).toMatchObject({
      command: 'bash',
      env: {
        API_URL: 'http://localhost:6021',
        API_URL_INTERNAL: 'http://localhost:6021',
      },
    });
  });

  test('returns empty when run script is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'ot-editor-config-empty-'));

    expect(
      buildManagedMcpServers({
        apiBaseUrl: 'http://localhost:6021',
        repositoryRoot: root,
      }),
    ).toEqual({});
  });
});
