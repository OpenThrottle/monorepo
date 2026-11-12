import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AGENT_CLI_ALLOWLIST, discoverAgentClis } from '../agent-discovery.ts';

// Bin-env override names (the driver registry owns these; referenced here as
// literals to keep the scan hermetic without importing per-driver internals).
const ANTIGRAVITY_BIN_ENV = 'OPENTHROTTLE_ANTIGRAVITY_BIN';
const CLAUDE_BIN_ENV = 'OPENTHROTTLE_CLAUDE_BIN';
const CODEX_BIN_ENV = 'OPENTHROTTLE_CODEX_BIN';
const CURSOR_AGENT_BIN_ENV = 'OPENTHROTTLE_CURSOR_AGENT_BIN';
const GROK_BIN_ENV = 'OPENTHROTTLE_GROK_BIN';
const OPENCODE_BIN_ENV = 'OPENTHROTTLE_OPENCODE_BIN';

let dir: string;

/**
 * Write a fake CLI that branches on argv: `<bin> models` prints `modelsOut`,
 * anything else (the `--version` probe) prints `versionOut`.
 */
function writeFakeBin(
  name: string,
  versionOut: string,
  modelsOut = '',
): string {
  const path = join(dir, name);
  const body = [
    'const a = process.argv.slice(2);',
    `if (a[0] === 'models') { process.stdout.write(${JSON.stringify(modelsOut)}); }`,
    `else { process.stdout.write(${JSON.stringify(versionOut)}); }`,
  ].join('\n');
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/**
 * Write a fake claude: `auth status --json` prints `auth`; anything else
 * (the `--version` probe) prints a version.
 */
function writeAuthBin(name: string, auth: Record<string, unknown>): string {
  const path = join(dir, name);
  const body = [
    'const a = process.argv.slice(2);',
    `if (a[0] === 'auth') { process.stdout.write(${JSON.stringify(JSON.stringify(auth))}); }`,
    `else { process.stdout.write('2.1.270 (Claude Code)\\n'); }`,
  ].join('\n');
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/** A fake claude whose auth output echoes the env it was spawned with. */
function writeEnvEchoBin(name: string): string {
  const path = join(dir, name);
  const body = [
    'const a = process.argv.slice(2);',
    'if (a[0] === "auth") {',
    '  const key = process.env.ANTHROPIC_API_KEY === undefined ? "absent" : "present";',
    '  const dirValue = process.env.CLAUDE_CONFIG_DIR || "none";',
    '  const user = process.env.USER || "none";',
    '  process.stdout.write(JSON.stringify({ email: "key=" + key + ";dir=" + dirValue + ";user=" + user, loggedIn: true }));',
    '} else { process.stdout.write("2.1.270\\n"); }',
  ].join('\n');
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/** Point every driver's bin-env at a missing path so PATH lookups can't leak. */
function hermeticEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    [ANTIGRAVITY_BIN_ENV]: join(dir, 'missing-antigravity'),
    [CLAUDE_BIN_ENV]: join(dir, 'missing-claude'),
    [CODEX_BIN_ENV]: join(dir, 'missing-codex'),
    [CURSOR_AGENT_BIN_ENV]: join(dir, 'missing-cursor'),
    [GROK_BIN_ENV]: join(dir, 'missing-grok'),
    HOME: process.env.HOME,
    [OPENCODE_BIN_ENV]: join(dir, 'missing-opencode'),
    PATH: process.env.PATH,
    ...overrides,
  };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'agent-discovery-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
});

describe('AGENT_CLI_ALLOWLIST', () => {
  it('is derived from the drivers registry (all six, incl. antigravity)', () => {
    expect(AGENT_CLI_ALLOWLIST.map((entry) => entry.backend).sort()).toEqual([
      'antigravity',
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);
  });

  it('marks every backend chat-capable (all six have streaming adapters)', () => {
    const byId = new Map(AGENT_CLI_ALLOWLIST.map((e) => [e.backend, e]));
    expect(byId.get('antigravity')?.chatCapable).toBe(true);
    expect(byId.get('claude')?.chatCapable).toBe(true);
    expect(byId.get('cursor')?.chatCapable).toBe(true);
    expect(byId.get('opencode')?.chatCapable).toBe(true);
    expect(byId.get('codex')?.chatCapable).toBe(true);
    expect(byId.get('grok')?.chatCapable).toBe(true);
  });

  it('projects supportsCustomBaseUrl from the driver capability (opencode/codex/grok yes; claude/cursor no)', () => {
    const byId = new Map(AGENT_CLI_ALLOWLIST.map((e) => [e.backend, e]));
    expect(byId.get('opencode')?.supportsCustomBaseUrl).toBe(true);
    expect(byId.get('codex')?.supportsCustomBaseUrl).toBe(true);
    expect(byId.get('grok')?.supportsCustomBaseUrl).toBe(true);
    expect(byId.get('claude')?.supportsCustomBaseUrl).toBe(false);
    expect(byId.get('cursor')?.supportsCustomBaseUrl).toBe(false);
  });
});

describe('discoverAgentClis', () => {
  it('probes every allowlisted backend, hiding unavailable ones', async () => {
    const result = await discoverAgentClis({ env: hermeticEnv({}) });

    expect(result.agents.map((agent) => agent.backend).sort()).toEqual([
      'antigravity',
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);
    expect(result.agents.every((agent) => !agent.available)).toBe(true);
    expect(result.agents.every((agent) => agent.models.length === 0)).toBe(
      true,
    );
  });

  it('reports cursor available with its version and parsed models', async () => {
    const bin = writeFakeBin(
      'cursor.js',
      '2026.06.15\n',
      'Available models\n\nauto - Auto (current, default)\ngpt-5.2 - GPT-5.2\n',
    );

    const result = await discoverAgentClis({
      env: hermeticEnv({ [CURSOR_AGENT_BIN_ENV]: bin }),
      scannedAt: '2026-06-19T00:00:00.000Z',
    });

    const cursor = result.agents.find((agent) => agent.backend === 'cursor');
    expect(cursor).toMatchObject({
      available: true,
      chatCapable: true,
      models: ['auto', 'gpt-5.2'],
      version: '2026.06.15',
    });
    expect(result.scannedAt).toBe('2026-06-19T00:00:00.000Z');
  });

  it('surfaces claude static models without spawning a list command', async () => {
    const bin = writeFakeBin('claude.js', '2.1.220 (Claude Code)\n');

    const result = await discoverAgentClis({
      env: hermeticEnv({ [CLAUDE_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'claude'),
    ).toMatchObject({
      available: true,
      models: ['opus', 'sonnet', 'haiku', 'fable'],
      version: '2.1.220 (Claude Code)',
    });
  });

  it('reports claude auth from `claude auth status --json` and flags an API-key override', async () => {
    const bin = writeAuthBin('claude-auth.js', {
      authMethod: 'claude.ai',
      email: 'dev@example.com',
      loggedIn: true,
      orgName: 'Example Org',
      subscriptionType: 'team',
    });

    const result = await discoverAgentClis({
      env: hermeticEnv({
        ANTHROPIC_API_KEY: 'sk-ant-test',
        [CLAUDE_BIN_ENV]: bin,
      }),
    });

    const claude = result.agents.find((agent) => agent.backend === 'claude');
    expect(claude?.auth).toMatchObject({
      accountEmail: 'dev@example.com',
      activeCredential: 'apiKey',
      apiKeyOverridesSubscription: true,
      subscriptionType: 'team',
    });
    expect(claude?.auth?.warning).toContain('ANTHROPIC_API_KEY is set');
    expect(JSON.stringify(result)).not.toContain('sk-ant-test');
  });

  it('never forwards ANTHROPIC_API_KEY to the auth probe, forwards USER, and resolves the chat config dir', async () => {
    const bin = writeEnvEchoBin('claude-env.js');

    const result = await discoverAgentClis({
      env: hermeticEnv({
        ANTHROPIC_API_KEY: 'sk-ant-test',
        [CLAUDE_BIN_ENV]: bin,
        CLAUDE_CONFIG_DIR: '/inherited',
        OPENTHROTTLE_CLAUDE_CONFIG_DIR: '/override',
        USER: 'probe-user',
      }),
    });

    // The stub reports the env it received via the (otherwise unused) email field.
    // USER matters: without it macOS claude cannot read its Keychain login.
    expect(
      result.agents.find((agent) => agent.backend === 'claude')?.auth
        ?.accountEmail,
    ).toBe('key=absent;dir=/override;user=probe-user');
  });

  it('leaves auth null for claude when the auth probe fails, and for other CLIs', async () => {
    const bin = writeFakeBin('claude-noauth.js', '2.1.220 (Claude Code)\n');
    const codex = writeFakeBin('codex-auth.js', 'codex-cli 0.145.0\n');

    const result = await discoverAgentClis({
      env: hermeticEnv({ [CLAUDE_BIN_ENV]: bin, [CODEX_BIN_ENV]: codex }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'claude'),
    ).toMatchObject({ auth: null, available: true });
    expect(
      result.agents.find((agent) => agent.backend === 'codex')?.auth,
    ).toBeNull();
  });

  it('reports codex available with empty models (no listing descriptor)', async () => {
    const bin = writeFakeBin('codex.js', 'codex-cli 0.145.0\n');

    const result = await discoverAgentClis({
      env: hermeticEnv({ [CODEX_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'codex'),
    ).toMatchObject({
      available: true,
      chatCapable: true,
      models: [],
      version: 'codex-cli 0.145.0',
    });
  });

  it('degrades models to [] when the list command exits non-zero', async () => {
    // A grok bin that succeeds on --version but fails `grok models`.
    const path = join(dir, 'grok-fail.js');
    writeFileSync(
      path,
      [
        '#!/usr/bin/env node',
        'const a = process.argv.slice(2);',
        `if (a[0] === 'models') { process.exit(1); }`,
        `else { process.stdout.write('grok 0.2.112\\n'); }`,
      ].join('\n'),
      'utf8',
    );
    chmodSync(path, 0o755);

    const result = await discoverAgentClis({
      env: hermeticEnv({ [GROK_BIN_ENV]: path }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'grok'),
    ).toMatchObject({ available: true, models: [], version: 'grok 0.2.112' });
  });

  it('parses grok bulleted models and strips the default marker', async () => {
    const bin = writeFakeBin(
      'grok-ok.js',
      'grok 0.2.112\n',
      'Available models:\n  * grok-4.5 (default)\n  * grok-4-fast\n',
    );

    const result = await discoverAgentClis({
      env: hermeticEnv({ [GROK_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'grok')?.models,
    ).toEqual(['grok-4.5', 'grok-4-fast']);
  });

  it('reports unavailable (and empty models) when the binary is missing', async () => {
    const result = await discoverAgentClis({ env: hermeticEnv({}) });
    expect(
      result.agents.find((agent) => agent.backend === 'opencode'),
    ).toMatchObject({ available: false, models: [], version: null });
  });

  it('reports unavailable when the version probe exits non-zero', async () => {
    const path = join(dir, 'opencode-fail.js');
    writeFileSync(path, `#!/usr/bin/env node\nprocess.exit(2);\n`, 'utf8');
    chmodSync(path, 0o755);

    const result = await discoverAgentClis({
      env: hermeticEnv({ [OPENCODE_BIN_ENV]: path }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'opencode')?.available,
    ).toBe(false);
  });
});

/** Write a fake grok that sleeps before answering `sleepOn` (`version` or `models`). */
function writeSlowBin(name: string, sleepOn: 'models' | 'version'): string {
  const path = join(dir, name);
  const body = [
    'const a = process.argv.slice(2);',
    `const slow = ${JSON.stringify(sleepOn)} === 'models' ? a[0] === 'models' : a[0] !== 'models';`,
    'const answer = () => process.stdout.write(a[0] === "models" ? "Available models:\\n  * grok-4.5\\n" : "grok 0.2.112\\n");',
    'if (slow) { setTimeout(answer, 2000); } else { answer(); }',
  ].join('\n');
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

describe('discoverAgentClis timeouts', () => {
  describe('when every probe answers in time', () => {
    it('reports timedOut false', async () => {
      const bin = writeFakeBin('grok-fast.js', 'grok 0.2.112\n', '  * a\n');
      const result = await discoverAgentClis({
        env: hermeticEnv({ [GROK_BIN_ENV]: bin }),
      });

      expect(
        result.agents.find((agent) => agent.backend === 'grok'),
      ).toMatchObject({ available: true, timedOut: false });
    });

    it('reports timedOut false for a missing binary (absent, not slow)', async () => {
      const result = await discoverAgentClis({ env: hermeticEnv({}) });

      expect(
        result.agents.find((agent) => agent.backend === 'grok'),
      ).toMatchObject({ available: false, timedOut: false });
    });
  });

  describe('when the version probe times out', () => {
    it('reports unavailable but flags it timedOut', async () => {
      const bin = writeSlowBin('grok-slow-version.js', 'version');
      const result = await discoverAgentClis({
        env: hermeticEnv({ [GROK_BIN_ENV]: bin }),
        probeTimeoutMs: 300,
      });

      expect(
        result.agents.find((agent) => agent.backend === 'grok'),
      ).toMatchObject({ available: false, models: [], timedOut: true });
    });
  });

  describe('when the model listing times out', () => {
    it('stays available with empty models and flags it timedOut', async () => {
      const bin = writeSlowBin('grok-slow-models.js', 'models');
      const result = await discoverAgentClis({
        env: hermeticEnv({ [GROK_BIN_ENV]: bin }),
        modelListTimeoutMs: 300,
      });

      expect(
        result.agents.find((agent) => agent.backend === 'grok'),
      ).toMatchObject({ available: true, models: [], timedOut: true });
    });
  });
});

/** A fake cursor-agent: `status` prints `statusOut` and exits `statusCode`. */
function writeCursorBin(statusOut: string, statusCode: number): string {
  const path = join(dir, `cursor-${statusCode}-${statusOut.length}`);
  const body = [
    'const a = process.argv.slice(2);',
    `if (a[0] === 'status') { process.stdout.write(${JSON.stringify(statusOut)}); process.exit(${statusCode}); }`,
    `else { process.stdout.write('2026.11.05\\n'); }`,
  ].join('\n');
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

describe('discoverAgentClis authState and capabilities', () => {
  it('reports capabilities per backend, following the ACP flag', async () => {
    const bin = writeFakeBin('cursor-caps', '2026.11.05\n');
    const base = await discoverAgentClis({
      env: hermeticEnv({ [CURSOR_AGENT_BIN_ENV]: bin }),
    });
    const acp = await discoverAgentClis({
      env: hermeticEnv({
        [CURSOR_AGENT_BIN_ENV]: bin,
        OPENTHROTTLE_CHAT_ACP_BACKENDS: 'cursor',
      }),
    });

    const pick = (result: typeof base) => {
      return result.agents.find((agent) => agent.backend === 'cursor')
        ?.capabilities;
    };

    expect(pick(base)).toMatchObject({ approvals: false, resume: true });
    expect(pick(acp)).toMatchObject({
      approvals: true,
      imageInput: true,
      mcpInjection: true,
    });
  });

  it('marks cursor authenticated when `status` says Logged in', async () => {
    const bin = writeCursorBin('Logged in as dev@example.com\n', 0);
    const result = await discoverAgentClis({
      env: hermeticEnv({ [CURSOR_AGENT_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'cursor')?.authState,
    ).toEqual({
      detail: 'Logged in as dev@example.com',
      status: 'authenticated',
    });
  });

  it('marks cursor unauthenticated on "Not logged in"', async () => {
    const bin = writeCursorBin('Not logged in\n', 0);
    const result = await discoverAgentClis({
      env: hermeticEnv({ [CURSOR_AGENT_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'cursor')?.authState
        .status,
    ).toBe('unauthenticated');
  });

  it('marks cursor unauthenticated when `status` exits non-zero', async () => {
    const bin = writeCursorBin('', 1);
    const result = await discoverAgentClis({
      env: hermeticEnv({ [CURSOR_AGENT_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'cursor')?.authState
        .status,
    ).toBe('unauthenticated');
  });

  it('derives the claude authState from `claude auth status`', async () => {
    const bin = writeAuthBin('claude-auth-state', {
      email: 'dev@example.com',
      loggedIn: true,
    });
    const result = await discoverAgentClis({
      env: hermeticEnv({ [CLAUDE_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'claude')?.authState,
    ).toEqual({ detail: 'dev@example.com', status: 'authenticated' });
  });

  it('reports unknown with no detail for backends that are not probed', async () => {
    const bin = writeFakeBin('opencode-auth', '1.18.5\n');
    const result = await discoverAgentClis({
      env: hermeticEnv({ [OPENCODE_BIN_ENV]: bin }),
    });

    expect(
      result.agents.find((agent) => agent.backend === 'opencode')?.authState,
    ).toEqual({ detail: null, status: 'unknown' });
  });
});
