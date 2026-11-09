/**
 * @description End to end against a FOREIGN repo, through the real ot-worktree scripts: a temp git
 * repo with no `package.json` and no `skills/` dir, cloned from a local bare origin. The worktree is
 * provisioned by the real `create.sh` and torn down by the real `destroy.sh` — both resolved through
 * the server's SSOT rung — and must reach REMOVED with the branch kept. A stub `pnpm` first on PATH
 * proves pnpm is never spawned on either side.
 *
 * Deliberately in its own file: the sibling unit test mocks `node:child_process` and `node:fs`.
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanRunWorktreeProvisionService } from '../plan-run-worktree-provision/plan-run-worktree-provision.service.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from './plan-run-worktree-teardown.service.ts';

/** The env keys this test overrides, restored after each case. */
const OVERRIDDEN_ENV_KEYS = [
  'OPENTHROTTLE_WORKTREE_PROVISION',
  'OPENTHROTTLE_WORKTREE_ROOT',
  'PATH',
] as const;

const WORKTREE_NAME = 'plan-1fdcec46';

describe('plan-run worktree lifecycle in a foreign repo', () => {
  let scratch: string;
  let checkout: string;
  let worktreeRoot: string;
  let pnpmMarker: string;
  let savedEnv: Record<string, string | undefined>;

  const git = (cwd: string, ...args: string[]): string => {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  };

  beforeEach(() => {
    scratch = realpathSync(mkdtempSync(join(tmpdir(), 'ot-foreign-teardown-')));
    const origin = join(scratch, 'acme', 'widgets.git');
    checkout = join(scratch, 'widgets');
    worktreeRoot = join(scratch, 'worktrees');
    pnpmMarker = join(scratch, 'pnpm-was-called');

    mkdirSync(origin, { recursive: true });
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    execFileSync('git', ['clone', '-q', origin, checkout], { stdio: 'ignore' });
    git(checkout, 'config', 'user.email', 'test@example.com');
    git(checkout, 'config', 'user.name', 'Test');
    git(checkout, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(checkout, 'README.md'), '# widgets\n');
    git(checkout, 'add', 'README.md');
    git(checkout, 'commit', '-q', '--no-verify', '-m', 'init');
    git(checkout, 'push', '-q', 'origin', 'main');
    git(checkout, 'remote', 'set-head', 'origin', 'main');

    const stubBin = join(scratch, 'bin');
    mkdirSync(stubBin);
    const stubPnpm = join(stubBin, 'pnpm');
    writeFileSync(stubPnpm, `#!/bin/sh\ntouch "${pnpmMarker}"\nexit 1\n`);
    chmodSync(stubPnpm, 0o755);

    savedEnv = Object.fromEntries(
      OVERRIDDEN_ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    delete process.env.OPENTHROTTLE_WORKTREE_PROVISION;
    process.env.OPENTHROTTLE_WORKTREE_ROOT = worktreeRoot;
    process.env.PATH = `${stubBin}:${process.env.PATH ?? ''}`;
  });

  afterEach(() => {
    for (const key of OVERRIDDEN_ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    rmSync(scratch, { force: true, recursive: true });
  });

  it('provisions with create.sh and tears down to REMOVED with destroy.sh, never pnpm', async () => {
    const provision = new PlanRunWorktreeProvisionService(
      createMock<LoggerService>(),
    );
    const teardown = new PlanRunWorktreeTeardownService(
      createMock<LoggerService>(),
      createMock<RepositoryCheckoutsService>({
        getRepository: vi.fn().mockReturnValue({
          find: vi.fn().mockResolvedValue([]),
        }),
      }),
      createMock<PlanRunsService>({
        findUnsettledRunsByCheckoutIds: vi.fn().mockResolvedValue([]),
      }),
    );

    const worktreePath = await provision.provision({
      baseCheckoutPath: checkout,
      worktreeName: WORKTREE_NAME,
    });
    expect(worktreePath).toBe(
      join(worktreeRoot, 'acme', 'widgets', WORKTREE_NAME),
    );

    const result = await teardown.teardown({
      baseCheckoutPath: checkout,
      worktreePath,
    });

    expect(result.outcome).toBe(PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED);
    expect(existsSync(worktreePath)).toBe(false);
    expect(
      git(checkout, 'branch', '--list', `openthrottle/${WORKTREE_NAME}`),
    ).toContain(`openthrottle/${WORKTREE_NAME}`);
    expect(existsSync(pnpmMarker)).toBe(false);
  }, 60_000);
});
