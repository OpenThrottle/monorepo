/**
 * @description Provisions a worktree for a FOREIGN repo through the real ot-worktree `create.sh`:
 * a temp git repo with no `package.json` and no `skills/` dir, so the script resolves through the
 * server's own SSOT rung. Asserts the worktree lands under `<root>/<org>/<repo>/<name>` and that
 * `pnpm` is never spawned — a stub `pnpm` first on PATH records any invocation.
 *
 * Deliberately in its own file: the sibling unit test mocks `node:child_process`.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PlanRunWorktreeProvisionService } from './plan-run-worktree-provision.service.ts';

/** The env keys this test overrides, restored after each case. */
const OVERRIDDEN_ENV_KEYS = [
  'OPENTHROTTLE_WORKTREE_PROVISION',
  'OPENTHROTTLE_WORKTREE_ROOT',
  'PATH',
] as const;

describe('PlanRunWorktreeProvisionService against a foreign repo', () => {
  let scratch: string;
  let checkout: string;
  let worktreeRoot: string;
  let pnpmMarker: string;
  let savedEnv: Record<string, string | undefined>;

  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', checkout, ...args], { stdio: 'ignore' });
  };

  beforeEach(() => {
    scratch = realpathSync(
      mkdtempSync(join(tmpdir(), 'ot-foreign-provision-')),
    );
    checkout = join(scratch, 'widgets');
    worktreeRoot = join(scratch, 'worktrees');
    pnpmMarker = join(scratch, 'pnpm-was-called');

    mkdirSync(checkout, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main', checkout]);
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('config', 'commit.gpgsign', 'false');
    writeFileSync(join(checkout, 'README.md'), '# widgets\n');
    git('add', 'README.md');
    git('commit', '-q', '--no-verify', '-m', 'init');
    git('remote', 'add', 'origin', 'git@github.com:acme/widgets.git');

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

  it('creates the worktree under <root>/<org>/<repo>/<name> without spawning pnpm', async () => {
    const service = new PlanRunWorktreeProvisionService(
      createMock<LoggerService>(),
    );

    const path = await service.provision({
      baseCheckoutPath: checkout,
      worktreeName: 'plan-1fdcec46',
    });

    expect(path).toBe(join(worktreeRoot, 'acme', 'widgets', 'plan-1fdcec46'));
    expect(existsSync(join(path, 'README.md'))).toBe(true);
    expect(existsSync(pnpmMarker)).toBe(false);
    expect(
      execFileSync('git', ['-C', path, 'branch', '--show-current'], {
        encoding: 'utf8',
      }).trim(),
    ).toBe('openthrottle/plan-1fdcec46');
  }, 30_000);
});
