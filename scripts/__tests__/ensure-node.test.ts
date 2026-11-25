/**
 * @description scripts/ensure-node.sh, the server boot gate, run against a temp checkout. Every
 * `node` is a shell stub answering `--version`, and `$NVM_DIR` is a fake install tree, so nothing
 * reads the developer's ~/.nvm.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const GATE = join(import.meta.dirname, '..', 'ensure-node.sh');

const tempRoots: string[] = [];

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

const makeTempDir = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ot-ensure-node-')));
  tempRoots.push(dir);

  return dir;
};

const installStubNode = (binDir: string, version: string): void => {
  mkdirSync(binDir, { recursive: true });
  const path = join(binDir, 'node');
  writeFileSync(path, `#!/bin/sh\necho v${version}\n`);
  chmodSync(path, 0o755);
};

interface GateSpec {
  readonly nvmInstalls: readonly string[];
  readonly range: string | undefined;
  readonly shellNode: string;
}

interface GateRun {
  readonly exitCode: number | null;
  readonly stderr: string;
}

const runGate = (spec: GateSpec): GateRun => {
  const scratch = makeTempDir();
  const checkout = join(scratch, 'checkout');
  const nvm = join(scratch, 'nvm');
  const shellBin = join(scratch, 'shell-bin');
  const manifest = spec.range === undefined ? {} : { engines: { node: spec.range } }; // prettier-ignore

  mkdirSync(checkout, { recursive: true });
  writeFileSync(join(checkout, 'package.json'), JSON.stringify(manifest));
  installStubNode(shellBin, spec.shellNode);
  for (const version of spec.nvmInstalls) {
    installStubNode(join(nvm, 'versions', 'node', `v${version}`, 'bin'), version); // prettier-ignore
  }

  const result = spawnSync('bash', [GATE, checkout], {
    encoding: 'utf8',
    env: { HOME: scratch, NVM_DIR: nvm, PATH: `${shellBin}:/usr/bin:/bin` },
  });

  return { exitCode: result.status, stderr: result.stderr };
};

describe('ensure-node.sh', () => {
  describe('when the PATH node satisfies engines.node', () => {
    it('passes silently', () => {
      expect(runGate({ nvmInstalls: [], range: '>=26', shellNode: '26.1.0' })).toEqual({ exitCode: 0, stderr: '' }); // prettier-ignore
    });
  });

  describe('when the PATH node is too old', () => {
    it('fails and prints the PATH export for a satisfying install', () => {
      const run = runGate({ nvmInstalls: ['26.1.0'], range: '>=26', shellNode: '24.15.0' }); // prettier-ignore

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain(
        'Node v24.15.0 does not satisfy engines.node ">=26"',
      );
      expect(run.stderr).toMatch(/export PATH=".*\/v26\.1\.0\/bin:\$PATH"/);
    });

    it('says to install one when nothing installed satisfies it', () => {
      const run = runGate({ nvmInstalls: ['24.15.0'], range: '>=26', shellNode: '24.15.0' }); // prettier-ignore

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain('nvm install');
    });
  });

  describe('when the checkout declares no engines.node', () => {
    it('passes', () => {
      expect(runGate({ nvmInstalls: [], range: undefined, shellNode: '18.0.0' }).exitCode).toBe(0); // prettier-ignore
    });
  });
});
