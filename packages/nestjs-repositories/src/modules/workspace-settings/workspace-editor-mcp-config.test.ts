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
          'mcp-developer': { command: 'old' },
        },
      },
      {
        'mcp-developer': {
          args: ['./scripts/run-mcp-developer.sh'],
          command: 'bash',
        },
      },
    );

    expect(merged.mcpServers?.fetch).toEqual({ args: [], command: 'docker' });
    expect(merged.mcpServers?.['mcp-developer']).toEqual({
      args: ['./scripts/run-mcp-developer.sh'],
      command: 'bash',
    });
  });
});

describe('buildManagedMcpServers', () => {
  test('returns mcp-developer when run script exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'ot-editor-config-'));
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(
      join(root, 'scripts', 'run-mcp-developer.sh'),
      '#!/bin/bash\n',
    );

    const servers = buildManagedMcpServers({
      apiBaseUrl: 'http://localhost:6021',
      repositoryRoot: root,
    });

    expect(servers['mcp-developer']).toMatchObject({
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
