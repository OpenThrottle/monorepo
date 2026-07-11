/**
 * @description Security regression tests for runChildJob: the Ralph spawn must NOT use
 * `shell: true`, so caller-controlled fields (planId, prompt, project, model, promptFile)
 * carrying shell metacharacters cannot be interpreted by `/bin/sh -c` (command injection / RCE).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { spawnSync as realSpawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ChildJobInput } from '../types/worktree';

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();

  return {
    ...actual,
    spawnSync: spawnSyncMock,
  };
});

vi.mock('@openthrottle/openthrottle-agentic-utils', () => ({
  getPostgresUrl: () => 'postgres://localhost:5432/test',
}));

vi.mock('./openthrottle-client', () => ({
  ensureOpenThrottleReachable: vi.fn(async () => undefined),
  getTasksByPlanId: vi.fn(async () => []),
  updatePlanStatus: vi.fn(async () => null),
}));

const buildInput = (planId: string): ChildJobInput => ({
  handoff: {
    branchName: 'feature/test',
    targetId: 'target-1',
    worktreePath: '/tmp/worktree-test',
  },
  planId,
});

describe('runChildJob — command injection hardening', () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
    // Default: ralph spawn succeeds, git spawns return harmless values.
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === 'git') {
        return { status: 0, stderr: '', stdout: 'abc123\n' };
      }

      return { status: 0, stderr: '', stdout: '' };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('never spawns the Ralph process with a shell', async () => {
    const { runChildJob } = await import('./child-job');

    await runChildJob(buildInput('11111111-1111-1111-1111-111111111111'));

    const ralphCall = spawnSyncMock.mock.calls.find(
      ([command]) => command === 'pnpm',
    );

    expect(ralphCall).toBeDefined();
    const options = ralphCall?.[2] ?? {};
    expect(options.shell).toBeUndefined();
    expect(options.shell).not.toBe(true);
  });

  it('passes a metacharacter-laden planId as a single literal argv element', async () => {
    const { runChildJob } = await import('./child-job');

    const maliciousPlanId = 'x; touch /tmp/pwned';
    await runChildJob(buildInput(maliciousPlanId));

    const ralphCall = spawnSyncMock.mock.calls.find(
      ([command]) => command === 'pnpm',
    );

    expect(ralphCall).toBeDefined();
    const args = ralphCall?.[1] ?? [];

    // The full malicious string is one argv element — not split on `;` or spaces.
    expect(args).toContain(maliciousPlanId);
  });

  it('does not execute injected commands when the spawn runs without a shell (behavioral proof)', () => {
    // This exercises the real spawnSync with the exact pattern child-job.ts uses:
    // args as an array, no `shell` option. A malicious "planId" carrying `; touch <file>`
    // must reach the program as a literal argument, never run as a separate shell command.
    const dir = mkdtempSync(join(tmpdir(), 'child-job-injection-'));
    const sentinel = join(dir, 'pwned');
    const maliciousPlanId = `x; touch ${sentinel}`;

    try {
      // `node -e ''` is a harmless no-op binary resolvable on PATH; passing the
      // malicious value as an argv element proves it is not shell-interpreted.
      realSpawnSync('node', ['-e', '', '--plan', maliciousPlanId], {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      expect(existsSync(sentinel)).toBe(false);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
