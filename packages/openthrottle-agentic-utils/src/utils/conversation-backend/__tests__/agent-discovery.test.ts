import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AGENT_CLI_ALLOWLIST, discoverAgentClis } from '../agent-discovery.ts';
import { CLAUDE_BIN_ENV } from '../claude/argv.ts';
import { CURSOR_AGENT_BIN_ENV } from '../cursor-agent/argv.ts';
import { OPENCODE_BIN_ENV } from '../opencode/argv.ts';

let dir: string;

function writeFakeBin(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'agent-discovery-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
});

describe('discoverAgentClis', () => {
  it('reports cursor available with its version when the binary responds', async () => {
    const bin = writeFakeBin(
      'cursor-version.js',
      `process.stdout.write('2026.06.15\\n');`,
    );

    const result = await discoverAgentClis({
      env: {
        [CURSOR_AGENT_BIN_ENV]: bin,
        HOME: process.env.HOME,
        PATH: process.env.PATH,
      },
      scannedAt: '2026-06-19T00:00:00.000Z',
    });

    const cursor = result.agents.find((agent) => agent.backend === 'cursor');
    expect(cursor).toMatchObject({ available: true, version: '2026.06.15' });
    expect(result.scannedAt).toBe('2026-06-19T00:00:00.000Z');
  });

  it('reports unavailable when the binary is missing', async () => {
    const result = await discoverAgentClis({
      env: {
        [CURSOR_AGENT_BIN_ENV]: join(dir, 'does-not-exist'),
        HOME: process.env.HOME,
        PATH: process.env.PATH,
      },
    });

    expect(
      result.agents.find((agent) => agent.backend === 'cursor'),
    ).toMatchObject({ available: false, version: null });
  });

  it('reports unavailable when --version exits non-zero', async () => {
    const bin = writeFakeBin('cursor-fail.js', `process.exit(2);`);

    const result = await discoverAgentClis({
      env: {
        [CURSOR_AGENT_BIN_ENV]: bin,
        HOME: process.env.HOME,
        PATH: process.env.PATH,
      },
    });

    expect(
      result.agents.find((agent) => agent.backend === 'cursor')?.available,
    ).toBe(false);
  });

  it('probes every allowlisted backend (claude, cursor, opencode)', async () => {
    // Point all three bins at missing paths so the scan is hermetic (no PATH
    // lookup of a really-installed CLI).
    const result = await discoverAgentClis({
      env: {
        [CLAUDE_BIN_ENV]: join(dir, 'missing-claude'),
        [CURSOR_AGENT_BIN_ENV]: join(dir, 'missing-cursor'),
        HOME: process.env.HOME,
        [OPENCODE_BIN_ENV]: join(dir, 'missing-opencode'),
        PATH: process.env.PATH,
      },
    });

    expect(result.agents.map((agent) => agent.backend).sort()).toEqual([
      'claude',
      'cursor',
      'opencode',
    ]);
    // With missing binaries none are available — discovery hides them.
    expect(result.agents.every((agent) => agent.available === false)).toBe(
      true,
    );
    expect(AGENT_CLI_ALLOWLIST.map((entry) => entry.backend).sort()).toEqual([
      'claude',
      'cursor',
      'opencode',
    ]);
  });

  it('reports claude available with its version when the binary responds', async () => {
    const bin = writeFakeBin(
      'claude-version.js',
      `process.stdout.write('2.1.220 (Claude Code)\\n');`,
    );

    const result = await discoverAgentClis({
      env: {
        [CLAUDE_BIN_ENV]: bin,
        HOME: process.env.HOME,
        PATH: process.env.PATH,
      },
    });

    expect(
      result.agents.find((agent) => agent.backend === 'claude'),
    ).toMatchObject({ available: true, version: '2.1.220 (Claude Code)' });
  });

  it('reports opencode available with its version when the binary responds', async () => {
    const bin = writeFakeBin(
      'opencode-version.js',
      `process.stdout.write('1.18.5\\n');`,
    );

    const result = await discoverAgentClis({
      env: {
        HOME: process.env.HOME,
        [OPENCODE_BIN_ENV]: bin,
        PATH: process.env.PATH,
      },
    });

    expect(
      result.agents.find((agent) => agent.backend === 'opencode'),
    ).toMatchObject({ available: true, version: '1.18.5' });
  });
});
