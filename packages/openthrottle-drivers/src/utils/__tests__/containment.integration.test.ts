/**
 * @description Live enforcement check for the containment mapping: runs the REAL CLI with the exact
 * sandbox flags `utils/containment.ts` emits, in a scratch working directory, and runs a probe that
 * tries to write outside it and to reach an allowlisted and a non-allowlisted host.
 *
 * Opt-in: set `OT_CONTAINMENT_LIVE=1`. A CLI that is not installed is skipped, not failed. The claude
 * case spends one small model call. Codex needs none, because `codex sandbox` runs a command under
 * the same policy `codex exec` would.
 *
 * `pnpm nx run openthrottle-drivers:test -- src/utils/__tests__/containment.integration.test.ts` with the
 * variable set. Results for 2026-11-24 are in plan 01a204c6-e136-7d15-8456-6ecbdbc3da4e's output.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { claudeDriver } from '../../drivers/index.ts';
import type { DriverContainment } from '../../types/index.ts';
import { codexContainmentShellFlags } from '../containment.ts';

const LIVE = process.env.OT_CONTAINMENT_LIVE === '1';
const ALLOWED_HOST = 'registry.npmjs.org';
const DENIED_HOST = 'example.com';
const LIVE_TIMEOUT_MS = 240_000;

const isInstalled = (binary: string): boolean => {
  return spawnSync('sh', ['-c', `command -v ${binary}`]).status === 0;
};

const PROFILE: DriverContainment = {
  extraWritableRoots: [],
  filesystem: 'worktree-write',
  network: { hosts: [ALLOWED_HOST], mode: 'allowlist' },
};

/** What the probe reports, one boolean per check. */
interface ProbeResult {
  readonly allowedHostReached: boolean;
  readonly deniedHostReached: boolean;
  readonly wroteInside: boolean;
  readonly wroteOutside: boolean;
}

/**
 * @description A probe the agent runs from its cwd. Each check prints a fixed marker, so the result
 * is read from markers rather than from whatever the CLI wraps around the output.
 */
const probeScript = (outsideFile: string): string => {
  return [
    `(echo in > inside.txt) 2>/dev/null && echo PROBE_INSIDE_OK`,
    `(echo out > '${outsideFile}') 2>/dev/null && echo PROBE_OUTSIDE_OK`,
    `curl -s -m 10 -o /dev/null https://${ALLOWED_HOST}/ && echo PROBE_ALLOWED_OK`,
    `curl -s -m 10 -o /dev/null https://${DENIED_HOST}/ && echo PROBE_DENIED_OK`,
    '',
  ].join('\n');
};

const readProbe = (
  output: string,
  cwd: string,
  outsideFile: string,
): ProbeResult => {
  return {
    allowedHostReached: output.includes('PROBE_ALLOWED_OK'),
    deniedHostReached: output.includes('PROBE_DENIED_OK'),
    // The files are the ground truth for writes; the markers only corroborate.
    wroteInside: existsSync(join(cwd, 'inside.txt')),
    wroteOutside: existsSync(outsideFile),
  };
};

describe.skipIf(!LIVE)('containment, live', () => {
  let cwd: string;
  let outsideDir: string;
  let outsideFile: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'ot-containment-live-'));
    // Outside the cwd AND outside $TMPDIR, which both sandboxes leave writable by default.
    const outsideParent = join(homedir(), '.openthrottle');
    await mkdir(outsideParent, { recursive: true });
    outsideDir = await mkdtemp(join(outsideParent, 'containment-live-'));
    outsideFile = join(outsideDir, 'outside.txt');
    await writeFile(join(cwd, 'probe.sh'), probeScript(outsideFile));
  });

  afterEach(async () => {
    await rm(cwd, { force: true, recursive: true });
    await rm(outsideDir, { force: true, recursive: true });
  });

  it.skipIf(!isInstalled('codex'))(
    'codex: writes stay in the cwd and egress stays off (no host allowlist: the allowed host is blocked too)',
    () => {
      // `codex sandbox` takes the policy as config, so `--sandbox <mode>` becomes `sandbox_mode=<mode>`.
      const flags = codexContainmentShellFlags(PROFILE).replace(
        /--sandbox (\S+)/,
        '-c sandbox_mode=$1',
      );
      const run = spawnSync(
        'sh',
        ['-c', `codex sandbox${flags} -- sh probe.sh`],
        { cwd, encoding: 'utf8', timeout: LIVE_TIMEOUT_MS },
      );

      expect(readProbe(`${run.stdout}${run.stderr}`, cwd, outsideFile)).toEqual(
        {
          allowedHostReached: false,
          deniedHostReached: false,
          wroteInside: true,
          wroteOutside: false,
        },
      );
    },
    LIVE_TIMEOUT_MS,
  );

  it.skipIf(!isInstalled('claude'))(
    'claude: writes stay in the cwd and egress reaches only the allowlisted host',
    () => {
      const command = claudeDriver.buildShellCommand({
        containment: PROFILE,
        iteration: 1,
        model: 'sonnet',
        prompt: `Run exactly this one Bash command and then reply with only its raw output: sh probe.sh`,
      });
      // Test-only: let the probe run unprompted. The driver itself leaves Bash permissions to the
      // repo's own rules, and a scratch directory has none.
      const run = spawnSync(
        'sh',
        ['-c', `${command} --allowedTools 'Bash(sh probe.sh)' < /dev/null`],
        { cwd, encoding: 'utf8', timeout: LIVE_TIMEOUT_MS },
      );

      expect(readProbe(`${run.stdout}${run.stderr}`, cwd, outsideFile)).toEqual(
        {
          allowedHostReached: true,
          deniedHostReached: false,
          wroteInside: true,
          wroteOutside: false,
        },
      );
    },
    LIVE_TIMEOUT_MS,
  );
});
