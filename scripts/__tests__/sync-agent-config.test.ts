import { describe, expect, it } from 'vitest';

import type { AgentConfig } from '../sync-agent-config.ts';
import {
  checkClaudeAttribution,
  parseAgentConfig,
  renderAntigravityMcpConfig,
  renderAntigravityPluginManifest,
  renderClaudeMcpJson,
  renderClaudeSettings,
  renderCodexConfig,
  renderCodexRules,
  renderCursorCli,
  renderOpencodeJson,
  renderVscodeMcpJson,
} from '../sync-agent-config.ts';

const stdio = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  return {
    args: ['--flag'],
    command: 'tool',
    defaultOn: true,
    description: 'A stdio server.',
    transport: 'stdio',
    ...overrides,
  };
};

const http = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  return {
    defaultOn: false,
    description: 'An http server.',
    transport: 'http',
    url: 'http://localhost:1/mcp',
    ...overrides,
  };
};

const load = (
  mcpServers: Record<string, unknown>,
  permissions: Record<string, unknown> = { allow: [], deny: [] },
): AgentConfig => {
  const result = parseAgentConfig({ mcpServers, permissions });

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.config;
};

const sample = (): AgentConfig => {
  return load({ alpha: stdio(), zeta: http() });
};

describe('parseAgentConfig', () => {
  it('sorts servers by name', () => {
    expect(sample().mcpServers.map((server) => server.name)).toEqual(['alpha', 'zeta']); // prettier-ignore
  });

  it.each([
    ['missing transport', stdio({ transport: undefined })],
    ['unknown transport', stdio({ transport: 'sse' })],
    ['stdio without command', stdio({ command: undefined })],
    ['stdio without args', stdio({ args: undefined })],
    ['stdio with url', stdio({ url: 'http://x' })],
    ['http without url', http({ url: undefined })],
    ['http with command', http({ command: 'x' })],
    ['non-boolean defaultOn', stdio({ defaultOn: 'yes' })],
    ['missing description', stdio({ description: undefined })],
  ])('rejects %s', (_label, entry) => {
    expect(
      parseAgentConfig({
        mcpServers: { bad: entry },
        permissions: { allow: [], deny: [] },
      }).ok,
    ).toBe(false);
  });

  it('rejects a non-object root and a non-object entry', () => {
    expect(parseAgentConfig(undefined).ok).toBe(false);
    expect(
      parseAgentConfig({
        mcpServers: { bad: 3 },
        permissions: { allow: [], deny: [] },
      }).ok,
    ).toBe(false);
  });
});

describe('renderClaudeMcpJson', () => {
  it('lists only default-on servers, alphabetized keys', () => {
    const config = load({
      off: http(),
      on: stdio(),
      on2: http({ defaultOn: true }),
    });
    const parsed: unknown = JSON.parse(renderClaudeMcpJson(config));

    expect(parsed).toEqual({
      mcpServers: {
        on: {
          args: ['--flag'],
          command: 'tool',
          description: 'A stdio server.',
        },
        on2: { description: 'An http server.', type: 'http', url: 'http://localhost:1/mcp' }, // prettier-ignore
      },
    });
    expect(Object.keys(Object(parsed).mcpServers.on)).toEqual(['args', 'command', 'description']); // prettier-ignore
  });
});

describe('renderAntigravityMcpConfig', () => {
  it('lists default-on servers and re-roots ./ args at the plugin folder', () => {
    const config = load({
      off: http(),
      on: stdio({ args: ['./scripts/run.sh', 'mcp'] }),
      on2: http({ defaultOn: true }),
    });

    expect(JSON.parse(renderAntigravityMcpConfig(config))).toEqual({
      mcpServers: {
        on: { args: ['../../../scripts/run.sh', 'mcp'], command: 'tool' },
        on2: { url: 'http://localhost:1/mcp' },
      },
    });
  });
});

describe('renderAntigravityPluginManifest', () => {
  it('names the plugin and marks it generated', () => {
    const manifest: unknown = JSON.parse(renderAntigravityPluginManifest());

    expect(manifest).toMatchObject({ name: 'openthrottle', version: '1.0.0' });
    expect(Object(manifest).description).toContain('GENERATED');
  });
});

describe('renderVscodeMcpJson', () => {
  it('drops descriptions and off servers', () => {
    const config = load({
      off: http(),
      on: stdio(),
      on2: http({ defaultOn: true }),
    });

    expect(JSON.parse(renderVscodeMcpJson(config))).toEqual({
      servers: {
        on: { args: ['--flag'], command: 'tool', type: 'stdio' },
        on2: { type: 'http', url: 'http://localhost:1/mcp' },
      },
    });
  });
});

describe('renderOpencodeJson', () => {
  const existing = JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    mcp: { stale: {} },
    permission: { skill: { '*': 'allow' } },
  });

  it('replaces only mcp, with every server, keeping key order', () => {
    const parsed: unknown = JSON.parse(renderOpencodeJson(sample(), existing));

    expect(Object.keys(Object(parsed))).toEqual([
      '$schema',
      'mcp',
      'permission',
    ]);
    expect(parsed).toEqual({
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        alpha: { command: ['tool', '--flag'], enabled: true, type: 'local' },
        zeta: { enabled: false, type: 'remote', url: 'http://localhost:1/mcp' },
      },
      permission: { bash: {}, skill: { '*': 'allow' } },
    });
  });
});

describe('renderClaudeSettings', () => {
  it('sets only enabledMcpjsonServers to the default-on names', () => {
    const existing = JSON.stringify({ attribution: { pr: '' }, enabledMcpjsonServers: [], hooks: {} }); // prettier-ignore
    const parsed: unknown = JSON.parse(
      renderClaudeSettings(sample(), existing),
    );

    expect(parsed).toEqual({ attribution: { pr: '' }, enabledMcpjsonServers: ['alpha'], hooks: {}, permissions: { allow: [], deny: [] } }); // prettier-ignore
    expect(Object.keys(Object(parsed))).toEqual(['attribution', 'enabledMcpjsonServers', 'hooks', 'permissions']); // prettier-ignore
  });
});

describe('renderCodexConfig', () => {
  it('renders a banner, comments and a table per server', () => {
    const toml = renderCodexConfig(sample());

    expect(toml).toBe(`# GENERATED — DO NOT EDIT
# Source: .agents/agent-config.json.
# Edit that file, then run pnpm exec tsx scripts/sync-agent-config.ts
# Servers with enabled = false are defined but off by default.

# Agent attribution off (AGENTS.md § No agent attribution).
commit_attribution = ""

# A stdio server.
[mcp_servers.alpha]
command = "tool"
args = ["--flag"]
enabled = true

# An http server.
[mcp_servers.zeta]
url = "http://localhost:1/mcp"
enabled = false
`);
  });

  it('wraps long descriptions at about 100 characters', () => {
    const long = Array.from({ length: 40 }, () => 'word').join(' ');
    const lines = renderCodexConfig(load({ a: stdio({ description: long }) }))
      .split('\n')
      .filter((line) => line.startsWith('# word'));

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 102)).toBe(true);
  });
});

const withPermissions = (
  allow: unknown[],
  deny: unknown[],
  mcpServers: Record<string, unknown> = { srv: stdio() },
): AgentConfig => {
  return load(mcpServers, { allow, deny });
};

const policy = (): AgentConfig => {
  return withPermissions(
    [{ shell: 'gh pr view *' }, { shell: 'pnpm' }, { mcpServer: 'srv' }],
    [
      {
        codexPrefixes: [['git', 'push', 'origin', 'main']],
        shell: 'git push*main*',
      },
      { shell: 'git push*+*' },
    ],
  );
};

describe('permission validation', () => {
  const parse = (allow: unknown[], deny: unknown[]): boolean => {
    return parseAgentConfig({
      mcpServers: { srv: stdio() },
      permissions: { allow, deny },
    }).ok;
  };

  it.each([
    ['both keys', [{ mcpServer: 'srv', shell: 'x' }], []],
    ['neither key', [{}], []],
    ['unknown mcpServer', [{ mcpServer: 'nope' }], []],
    ['codexPrefixes on allow', [{ codexPrefixes: [['a']], shell: 'x' }], []],
    ['empty prefix', [], [{ codexPrefixes: [[]], shell: 'x' }]],
    [
      'non-string prefix element',
      [],
      [{ codexPrefixes: [[['a']]], shell: 'x' }],
    ],
    ['codexPrefixes on an mcpServer rule', [], [{ codexPrefixes: [['a']], mcpServer: 'srv' }]], // prettier-ignore
  ])('rejects %s', (_label, allow, deny) => {
    expect(parse(allow, deny)).toBe(false);
  });

  it('rejects a missing permissions block', () => {
    expect(parseAgentConfig({ mcpServers: {} }).ok).toBe(false);
  });
});

describe('renderCursorCli', () => {
  it('splits at the first space, handles no-space and mcp, emits only permissions', () => {
    const parsed: unknown = JSON.parse(renderCursorCli(policy()));

    expect(parsed).toEqual({
      permissions: {
        allow: ['Shell(gh:pr view *)', 'Shell(pnpm)', 'Mcp(srv:*)'],
        deny: ['Shell(git:push*main*)', 'Shell(git:push*+*)'],
      },
    });
    expect(Object.keys(Object(parsed))).toEqual(['permissions']);
  });
});

describe('permissions in opencode.json', () => {
  it('writes allows then denies, keeps permission.skill, skips mcp rules', () => {
    const existing = JSON.stringify({
      mcp: {},
      permission: { skill: { '*': 'allow' } },
    });
    const parsed: unknown = JSON.parse(renderOpencodeJson(policy(), existing));
    const permission = Object(parsed).permission;

    expect(Object.entries(permission.bash)).toEqual([
      ['gh pr view *', 'allow'],
      ['pnpm', 'allow'],
      ['git push*main*', 'deny'],
      ['git push*+*', 'deny'],
    ]);
    expect(permission.skill).toEqual({ '*': 'allow' });
  });
});

describe('permissions in .claude/settings.json', () => {
  it('maps rules in SSOT order and preserves ask and additionalDirectories', () => {
    const existing = JSON.stringify({
      attribution: { commit: '', pr: '' },
      permissions: {
        additionalDirectories: ['/x'],
        allow: ['old'],
        ask: ['Bash(rm *)'],
      },
    });
    const parsed: unknown = JSON.parse(
      renderClaudeSettings(policy(), existing),
    );

    expect(Object(parsed).permissions).toEqual({
      additionalDirectories: ['/x'],
      allow: ['Bash(gh pr view *)', 'Bash(pnpm)', 'mcp__srv__*'],
      ask: ['Bash(rm *)'],
      deny: ['Bash(git push*main*)', 'Bash(git push*+*)'],
    });
    expect(Object(parsed).attribution).toEqual({ commit: '', pr: '' });
  });
});

describe('renderCodexRules', () => {
  it('emits one forbidden prefix_rule per codexPrefixes entry and no allows', () => {
    expect(renderCodexRules(policy())).toBe(`# GENERATED — DO NOT EDIT
# Source: .agents/agent-config.json.
# Edit that file, then run pnpm exec tsx scripts/sync-agent-config.ts

prefix_rule(pattern=["git", "push", "origin", "main"], decision="forbidden", justification="git push*main* (from .agents/agent-config.json)")
`);
  });
});

describe('checkClaudeAttribution', () => {
  it('passes when both are empty strings', () => {
    expect(checkClaudeAttribution('{"attribution":{"commit":"","pr":""}}')).toEqual([]); // prettier-ignore
  });

  it.each([
    '{}',
    '{"attribution":{"commit":"x","pr":""}}',
    '{"attribution":{"commit":""}}',
  ])('fails for %s', (settings) => {
    expect(checkClaudeAttribution(settings).length).toBeGreaterThan(0);
  });
});
