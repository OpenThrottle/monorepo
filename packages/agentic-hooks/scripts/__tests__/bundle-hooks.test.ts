/**
 * @description The committed plugin stub that bundle-hooks writes, run for real. Stubs run in
 * users' own repos on whatever `node` the agent hands them (the Claude desktop app lists nvm
 * installs oldest-first), so below the bundle target they must re-run the bundle on a newer
 * installed Node, never the host repo's, and stay silent when there is none.
 *
 * Hermetic: an "old" parent Node is the test's own Node with `process.versions.node` faked by a
 * `--require` preload; every other `node` is a `/bin/sh` stub that announces itself; `$NVM_DIR`
 * is a fake install tree and `PATH` holds no real `node`.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const COMMITTED_STUB = join(REPO_ROOT, 'plugins', 'openthrottle', 'bin', 'skill-usage-outcome.cjs'); // prettier-ignore
const STUB_FILE = 'skill-usage-outcome.cjs';

const tempRoots: string[] = [];

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

const makeTempDir = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ot-hook-stub-')));
  tempRoots.push(dir);

  return dir;
};

/** A `node` stand-in: answers `--version`, otherwise prints its version and arguments and exits 7. */
const installStubNode = (binDir: string, version: string): string => {
  mkdirSync(binDir, { recursive: true });
  const path = join(binDir, 'node');
  writeFileSync(path, `#!/bin/sh\nif [ "$1" = --version ]; then echo v${version}; exit 0; fi\necho "REEXEC v${version} $*"\nexit 7\n`); // prettier-ignore
  chmodSync(path, 0o755);

  return path;
};

interface Fixture {
  readonly emptyPath: string;
  readonly hostRepo: string;
  readonly nvm: string;
  readonly preload: string;
  readonly stub: string;
  readonly target: string;
}

/** The committed stub copied beside a fake `dist/` bundle that reports the Node it ran on. */
const makeFixture = (nvmInstalls: readonly string[]): Fixture => {
  const scratch = makeTempDir();
  const plugin = join(scratch, 'plugin');
  const stub = join(plugin, 'bin', STUB_FILE);
  const target = join(plugin, 'dist', STUB_FILE);
  const nvm = join(scratch, 'nvm');
  const emptyPath = join(scratch, 'empty-path');
  const hostRepo = join(scratch, 'host-repo');
  const preload = join(scratch, 'old-node.cjs');

  mkdirSync(join(plugin, 'bin'), { recursive: true });
  mkdirSync(join(plugin, 'dist'), { recursive: true });
  mkdirSync(emptyPath, { recursive: true });
  mkdirSync(hostRepo, { recursive: true });
  copyFileSync(COMMITTED_STUB, stub);
  writeFileSync(target, "console.log('IN_PROCESS ' + process.argv.slice(2).join(' '));\n"); // prettier-ignore
  writeFileSync(preload, "Object.defineProperty(process.versions, 'node', { value: '18.20.5' });\n"); // prettier-ignore
  for (const version of nvmInstalls) {
    installStubNode(join(nvm, 'versions', 'node', `v${version}`, 'bin'), version); // prettier-ignore
  }

  return { emptyPath, hostRepo, nvm, preload, stub, target };
};

interface StubRun {
  readonly exitCode: number | null;
  readonly stdout: string;
}

interface RunOptions {
  readonly env?: Readonly<Record<string, string>>;
  readonly oldNode: boolean;
}

const runStub = (fixture: Fixture, options: RunOptions): StubRun => {
  const preload = options.oldNode ? ['--require', fixture.preload] : [];
  const result = spawnSync(
    process.execPath,
    [...preload, fixture.stub, '--outcome', 'success'],
    {
      // prettier-ignore
      cwd: fixture.hostRepo,
      encoding: 'utf8',
      env: { HOME: fixture.hostRepo, NVM_DIR: fixture.nvm, PATH: fixture.emptyPath, ...options.env }, // prettier-ignore
    },
  );

  return { exitCode: result.status, stdout: result.stdout.trim() };
};

describe('plugin stub', () => {
  describe('when its own Node is new enough', () => {
    it('runs the bundle in process', () => {
      const fixture = makeFixture(['24.18.0']);

      expect(runStub(fixture, { oldNode: false })).toEqual({ exitCode: 0, stdout: 'IN_PROCESS --outcome success' }); // prettier-ignore
    });
  });

  describe('when its own Node is too old', () => {
    it('re-runs the bundle on the newest nvm install and passes its exit code through', () => {
      const fixture = makeFixture(['20.18.3', '22.23.2', '24.18.0', '24.9.0']);

      expect(runStub(fixture, { oldNode: true })).toEqual({ exitCode: 7, stdout: `REEXEC v24.18.0 ${fixture.target} --outcome success` }); // prettier-ignore
    });

    it("ignores the host repo's .nvmrc", () => {
      const fixture = makeFixture(['20.18.3', '24.18.0']);
      writeFileSync(join(fixture.hostRepo, '.nvmrc'), '20.18.3\n');

      expect(runStub(fixture, { oldNode: true }).stdout).toContain(
        'REEXEC v24.18.0',
      );
    });

    it('prefers OT_NODE over nvm installs', () => {
      const fixture = makeFixture(['24.18.0']);
      const explicit = installStubNode(join(makeTempDir(), 'bin'), '26.1.0');

      expect(runStub(fixture, { env: { OT_NODE: explicit }, oldNode: true }).stdout).toContain('REEXEC v26.1.0'); // prettier-ignore
    });

    it('falls back to a new-enough node on PATH', () => {
      const fixture = makeFixture([]);
      const pathBin = join(makeTempDir(), 'bin');
      installStubNode(pathBin, '22.23.2');

      expect(runStub(fixture, { env: { PATH: pathBin }, oldNode: true }).stdout).toContain('REEXEC v22.23.2'); // prettier-ignore
    });

    it('exits 0 without a word when no installed Node is new enough', () => {
      const fixture = makeFixture(['20.18.3']);

      expect(runStub(fixture, { oldNode: true })).toEqual({
        exitCode: 0,
        stdout: '',
      });
    });
  });
});
