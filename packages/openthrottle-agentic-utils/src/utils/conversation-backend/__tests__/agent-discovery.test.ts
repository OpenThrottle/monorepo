import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { discoverAgentClis } from '../agent-discovery.ts';
import { CURSOR_AGENT_BIN_ENV } from '../cursor-agent/argv.ts';

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
});
