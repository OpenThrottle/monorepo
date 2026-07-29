import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AGENT_CLI_ALLOWLIST, discoverAgentClis } from '../agent-discovery.ts';

// Bin-env override names (the driver registry owns these; referenced here as
// literals to keep the scan hermetic without importing per-driver internals).
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

/** Point every driver's bin-env at a missing path so PATH lookups can't leak. */
function hermeticEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
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
  it('is derived from the drivers registry (all five, incl. codex + grok)', () => {
    expect(AGENT_CLI_ALLOWLIST.map((entry) => entry.backend).sort()).toEqual([
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);
  });

  it('marks claude/cursor/opencode/codex/grok chat-capable (all have streaming adapters)', () => {
    const byId = new Map(AGENT_CLI_ALLOWLIST.map((e) => [e.backend, e]));
    expect(byId.get('claude')?.chatCapable).toBe(true);
    expect(byId.get('cursor')?.chatCapable).toBe(true);
    expect(byId.get('opencode')?.chatCapable).toBe(true);
    expect(byId.get('codex')?.chatCapable).toBe(true);
    expect(byId.get('grok')?.chatCapable).toBe(true);
  });
});

describe('discoverAgentClis', () => {
  it('probes every allowlisted backend, hiding unavailable ones', async () => {
    const result = await discoverAgentClis({ env: hermeticEnv({}) });

    expect(result.agents.map((agent) => agent.backend).sort()).toEqual([
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
