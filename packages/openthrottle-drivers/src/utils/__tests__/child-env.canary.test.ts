/**
 * @description Canary for the scheduled-job spawn path: a real stub agent CLI (named by
 * `OPENTHROTTLE_CLAUDE_BIN`) records the NAMES of every variable it received, and the suite fails
 * if any sentinel secret set in the parent env reached it. No `child_process` mock — this is the
 * process boundary itself. A sibling canary covers the OT Loop path (openthrottle-server's
 * ot-loop.utils.test.ts).
 */

import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RUN_AGENT_STATUS, runAgentPrompt } from '../runAgentPrompt.ts';

const SENTINEL_NAMES: readonly string[] = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'ELEVENLABS_API_KEY',
  'FISH_AUDIO_API_KEY',
  'GEMINI_API_KEY',
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'HCLOUD_TOKEN',
  'OPENAI_API_KEY',
  'OPENTHROTTLE_DEVELOPER_JWT_SECRET',
  'OT_CANARY_SECRET',
  'POSTGRES_PASSWORD',
  'ROLLBAR_TOKEN',
];

const SENTINELS = new Set<string>(SENTINEL_NAMES);

describe('child env canary — scheduled-job path (runAgentPrompt)', () => {
  let dir: string;
  let namesFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'child-env-canary-'));
    namesFile = join(dir, 'names.txt');
    const stub = join(dir, 'claude-stub');
    writeFileSync(
      stub,
      `#!/bin/sh\n/usr/bin/env | cut -d= -f1 | sort > '${namesFile}'\n`,
    );
    chmodSync(stub, 0o755);
    vi.stubEnv('OPENTHROTTLE_CLAUDE_BIN', stub);
    for (const name of SENTINEL_NAMES) {
      vi.stubEnv(name, 'sentinel-secret-value');
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(dir, { force: true, recursive: true });
  });

  describe('when the server env holds secrets', () => {
    it('delivers none of their names to the agent CLI', async () => {
      const result = await runAgentPrompt({
        driverId: 'claude',
        prompt: 'canary',
      });

      const received = readFileSync(namesFile, 'utf8').split('\n');
      expect(result.status).toBe(RUN_AGENT_STATUS.ok);
      expect(received).toContain('PATH');
      expect(received.filter((name) => SENTINELS.has(name))).toEqual([]);
    });
  });
});
