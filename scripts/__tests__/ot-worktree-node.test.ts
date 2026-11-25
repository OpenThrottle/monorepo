/**
 * @description The real ot-worktree `create.sh` run against a temp repo, pinning that provisioning
 * happens on the repo's Node and not on the caller's. The incident it encodes: an agent's Bash tool
 * resolves nvm's default alias (v24) while the repo pins v26, so `pnpm run worktree:new` died at
 * `preinstall` and left a half-provisioned worktree behind.
 *
 * Hermetic: every `node` is a shell stub answering `--version`, `$NVM_DIR` is a fake install tree,
 * and the repo's provisioner only records which `node` it sees. Nothing reads the developer's
 * ~/.nvm, and no `pnpm` runs.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const REPO_DIR = join(import.meta.dirname, '..', '..');
const CREATE_SCRIPT = join(REPO_DIR, 'skills', 'ot-worktree', 'scripts', 'create.sh'); // prettier-ignore
const NODE_PATH_SCRIPT = join(REPO_DIR, 'skills', 'ot-worktree', 'scripts', 'node-path.sh'); // prettier-ignore
const SHELL_NODE = '24.15.0';
const PINNED_NODE = '26.1.0';

const tempRoots: string[] = [];

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

const makeTempDir = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ot-worktree-node-')));
  tempRoots.push(dir);

  return dir;
};

/** Write an executable `node` stub reporting `version` into `binDir`. */
const installStubNode = (binDir: string, version: string): void => {
  mkdirSync(binDir, { recursive: true });
  const path = join(binDir, 'node');
  writeFileSync(path, `#!/bin/sh\necho v${version}\n`);
  chmodSync(path, 0o755);
};

interface RepoSpec {
  readonly nvmInstalls: readonly string[];
  readonly nvmrc: string | undefined;
  readonly range: string | undefined;
}

interface Fixture {
  readonly env: Readonly<Record<string, string>>;
  readonly nodeSeen: string;
  readonly repo: string;
  readonly worktreeRoot: string;
}

/**
 * A git repo whose `.worktree/provision.sh` writes `node --version` to `nodeSeen`, an nvm tree
 * holding `nvmInstalls`, and a shell whose own `node` is {@link SHELL_NODE}.
 */
const makeFixture = (spec: RepoSpec): Fixture => {
  const scratch = makeTempDir();
  const repo = join(scratch, 'widgets');
  const nvm = join(scratch, 'nvm');
  const shellBin = join(scratch, 'shell-bin');
  const nodeSeen = join(scratch, 'node-seen');
  const worktreeRoot = join(scratch, 'worktrees');
  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' });
  };

  installStubNode(shellBin, SHELL_NODE);
  for (const version of spec.nvmInstalls) {
    installStubNode(join(nvm, 'versions', 'node', `v${version}`, 'bin'), version); // prettier-ignore
  }

  mkdirSync(join(repo, '.worktree'), { recursive: true });
  const manifest = spec.range === undefined ? { name: 'widgets' } : { engines: { node: spec.range }, name: 'widgets' }; // prettier-ignore
  writeFileSync(join(repo, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`); // prettier-ignore
  if (spec.nvmrc !== undefined) {
    writeFileSync(join(repo, '.nvmrc'), `${spec.nvmrc}\n`);
  }
  const provision = join(repo, '.worktree', 'provision.sh');
  writeFileSync(provision, '#!/bin/sh\nnode --version > "$NODE_SEEN"\n');
  chmodSync(provision, 0o755);

  execFileSync('git', ['init', '-q', '-b', 'main', repo]);
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', 'init');

  return {
    env: {
      HOME: scratch,
      NODE_SEEN: nodeSeen,
      NVM_DIR: nvm,
      OPENTHROTTLE_WORKTREE_ROOT: worktreeRoot,
      PATH: `${shellBin}:${process.env.PATH ?? ''}`,
    },
    nodeSeen,
    repo,
    worktreeRoot,
  };
};

interface CreateResult {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

const runCreate = (fixture: Fixture): CreateResult => {
  const result = spawnSync('bash', [CREATE_SCRIPT, 'feature'], {
    cwd: fixture.repo,
    encoding: 'utf8',
    env: { ...fixture.env },
    input: '',
  });

  return { exitCode: result.status, stderr: result.stderr, stdout: result.stdout.trim() }; // prettier-ignore
};

describe('create.sh provisions on the repo Node', () => {
  describe('when the shell Node is older than the pinned one', () => {
    it('runs the provisioner on the .nvmrc install', () => {
      const fixture = makeFixture({ nvmInstalls: [SHELL_NODE, PINNED_NODE], nvmrc: PINNED_NODE, range: '>=26' }); // prettier-ignore

      const result = runCreate(fixture);

      expect(result.exitCode).toBe(0);
      expect(existsSync(result.stdout)).toBe(true);
      expect(readFileSync(fixture.nodeSeen, 'utf8').trim()).toBe(`v${PINNED_NODE}`); // prettier-ignore
    });
  });

  describe('when nothing installed satisfies engines.node', () => {
    it('fails before creating the worktree and says what it tried', () => {
      const fixture = makeFixture({ nvmInstalls: [SHELL_NODE], nvmrc: PINNED_NODE, range: '>=26' }); // prettier-ignore

      const result = runCreate(fixture);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('tried:');
      expect(existsSync(fixture.worktreeRoot)).toBe(false);
      expect(existsSync(fixture.nodeSeen)).toBe(false);
    });
  });

  describe('when the repo declares no engines.node', () => {
    it("leaves the caller's Node alone", () => {
      const fixture = makeFixture({ nvmInstalls: [PINNED_NODE], nvmrc: undefined, range: undefined }); // prettier-ignore

      const result = runCreate(fixture);

      expect(result.exitCode).toBe(0);
      expect(readFileSync(fixture.nodeSeen, 'utf8').trim()).toBe(`v${SHELL_NODE}`); // prettier-ignore
    });
  });

  describe('when OPENTHROTTLE_WORKTREE_NODE=0', () => {
    it("keeps the caller's Node even though the repo pins another", () => {
      const fixture = makeFixture({ nvmInstalls: [PINNED_NODE], nvmrc: PINNED_NODE, range: '>=24' }); // prettier-ignore

      const result = runCreate({ ...fixture, env: { ...fixture.env, OPENTHROTTLE_WORKTREE_NODE: '0' } }); // prettier-ignore

      expect(result.exitCode).toBe(0);
      expect(readFileSync(fixture.nodeSeen, 'utf8').trim()).toBe(`v${SHELL_NODE}`); // prettier-ignore
    });
  });
});

describe('node-path.sh', () => {
  const runNodePath = (fixture: Fixture): CreateResult => {
    const result = spawnSync('bash', [NODE_PATH_SCRIPT, fixture.repo], { encoding: 'utf8', env: { ...fixture.env } }); // prettier-ignore

    return { exitCode: result.status, stderr: result.stderr, stdout: result.stdout }; // prettier-ignore
  };

  it('prints ok, the bin dir and the version on success', () => {
    const fixture = makeFixture({ nvmInstalls: [PINNED_NODE], nvmrc: PINNED_NODE, range: '>=26' }); // prettier-ignore

    const result = runNodePath(fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(`ok\t${join(fixture.env.NVM_DIR ?? '', 'versions', 'node', `v${PINNED_NODE}`, 'bin')}\tv${PINNED_NODE}\n`); // prettier-ignore
  });

  it('prints none when the checkout has no engines.node', () => {
    const fixture = makeFixture({ nvmInstalls: [], nvmrc: undefined, range: undefined }); // prettier-ignore

    expect(runNodePath(fixture)).toMatchObject({
      exitCode: 0,
      stdout: 'none\n',
    });
  });

  it('prints fail with the range and exits 1 when nothing fits', () => {
    const fixture = makeFixture({ nvmInstalls: [SHELL_NODE], nvmrc: undefined, range: '>=26' }); // prettier-ignore

    const result = runNodePath(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stdout.startsWith('fail\t>=26\t')).toBe(true);
  });
});
