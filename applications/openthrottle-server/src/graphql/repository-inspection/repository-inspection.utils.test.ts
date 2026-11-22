import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { countRepoAgentConfig } from './repository-inspection.utils.ts';

const fixture = (files: Readonly<Record<string, string>>): string => {
  const root = mkdtempSync(join(tmpdir(), 'ot-inspect-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, content);
  }

  return root;
};

describe('countRepoAgentConfig', () => {
  it('counts nothing in a checkout with no agent config', () => {
    expect(countRepoAgentConfig(fixture({}))).toEqual({
      hookCount: 0,
      mcpServerCount: 0,
    });
  });

  it('counts Claude hook commands across project and local settings', () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { hooks: [{ command: 'a', type: 'command' }], matcher: 'Bash' },
          { hooks: [{ command: 'b' }, { command: 'c' }], matcher: '*' },
        ],
        SessionStart: [{ hooks: [{ command: 'd' }] }],
      },
    });
    const local = JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: 'e' }] }] },
    });

    expect(
      countRepoAgentConfig(
        fixture({
          '.claude/settings.json': settings,
          '.claude/settings.local.json': local,
        }),
      ).hookCount,
    ).toBe(5);
  });

  it('counts Cursor hooks.json entries', () => {
    const hooks = JSON.stringify({
      hooks: { afterFileEdit: [{ command: 'x' }, { command: 'y' }] },
      version: 1,
    });

    expect(
      countRepoAgentConfig(fixture({ '.cursor/hooks.json': hooks })).hookCount,
    ).toBe(2);
  });

  it('counts MCP servers in .mcp.json and .cursor/mcp.json', () => {
    const servers = (names: readonly string[]): string => {
      return JSON.stringify({
        mcpServers: Object.fromEntries(
          names.map((name) => [name, { command: name }]),
        ),
      });
    };

    expect(
      countRepoAgentConfig(
        fixture({
          '.cursor/mcp.json': servers(['c']),
          '.mcp.json': servers(['a', 'b']),
        }),
      ).mcpServerCount,
    ).toBe(3);
  });

  it('counts malformed or oddly shaped files as zero', () => {
    expect(
      countRepoAgentConfig(
        fixture({
          '.claude/settings.json': '{ not json',
          '.cursor/hooks.json': JSON.stringify({ hooks: [] }),
          '.mcp.json': JSON.stringify({ mcpServers: ['a'] }),
        }),
      ),
    ).toEqual({ hookCount: 0, mcpServerCount: 0 });
  });
});
