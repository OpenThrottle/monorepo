import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MINIMUM_NODE_MAJOR } from './config.constants.ts';
import {
  checkNodeVersion,
  resolveEnvFilePaths,
  resolveProcessRole,
} from './config.utils.ts';

describe('resolveProcessRole', () => {
  const originalRole = process.env.PROCESS_ROLE;

  beforeEach(() => {
    delete process.env.PROCESS_ROLE;
  });

  afterEach(() => {
    if (originalRole === undefined) {
      delete process.env.PROCESS_ROLE;
    } else {
      process.env.PROCESS_ROLE = originalRole;
    }
  });

  it('defaults to all when PROCESS_ROLE is unset', () => {
    expect(resolveProcessRole()).toBe('all');
  });

  it('defaults to all when PROCESS_ROLE is blank', () => {
    process.env.PROCESS_ROLE = '  ';

    expect(resolveProcessRole()).toBe('all');
  });

  it('accepts api, worker, and all (case-insensitive)', () => {
    process.env.PROCESS_ROLE = 'api';
    expect(resolveProcessRole()).toBe('api');

    process.env.PROCESS_ROLE = 'WORKER';
    expect(resolveProcessRole()).toBe('worker');

    process.env.PROCESS_ROLE = 'All';
    expect(resolveProcessRole()).toBe('all');
  });

  it('fails fast on an unknown role instead of running the wrong module graph', () => {
    process.env.PROCESS_ROLE = 'apii';

    expect(() => resolveProcessRole()).toThrow('Invalid PROCESS_ROLE "apii"');
  });
});

describe('checkNodeVersion', () => {
  it('accepts the minimum major and newer', () => {
    expect(checkNodeVersion(`${MINIMUM_NODE_MAJOR}.0.0`)).toEqual({
      kind: 'supported',
    });
    expect(checkNodeVersion(`v${MINIMUM_NODE_MAJOR + 1}.2.3`)).toEqual({
      kind: 'supported',
    });
  });

  it('rejects an older major and names the fix', () => {
    const check = checkNodeVersion('24.15.0');

    expect(check.kind).toBe('unsupported');
    expect(check.kind === 'unsupported' && check.message).toContain(
      'monorepo:ensure-node',
    );
  });

  it('rejects a version it cannot parse', () => {
    expect(checkNodeVersion('garbage').kind).toBe('unsupported');
  });

  it('matches the lowest major the root engines.node allows', () => {
    const rootManifest = join(import.meta.dirname, '../../../../package.json');
    const manifest: unknown = JSON.parse(readFileSync(rootManifest, 'utf8'));
    const engines = isRecord(manifest) ? manifest.engines : undefined;
    const range = isRecord(engines) ? engines.node : undefined;

    expect(range).toBe(`>=${MINIMUM_NODE_MAJOR}`);
  });
});

describe('resolveEnvFilePaths', () => {
  const existsIn = (paths: readonly string[]): ((path: string) => boolean) => {
    const set = new Set(paths);
    return (path) => {
      return set.has(path);
    };
  };

  const workspace = [
    '/repo/.openthrottle.mjs',
    '/repo/.env',
    '/repo/applications/openthrottle-server/package.json',
    '/repo/applications/openthrottle-server/.env',
  ];

  describe('when run from the tsc output in build/src', () => {
    it('loads the app .env first, then the workspace root .env', () => {
      expect(
        resolveEnvFilePaths(
          '/repo/applications/openthrottle-server/build/src',
          existsIn(workspace),
        ),
      ).toEqual(['/repo/applications/openthrottle-server/.env', '/repo/.env']);
    });
  });

  describe('when run from source', () => {
    it('resolves the same files from src', () => {
      expect(
        resolveEnvFilePaths(
          '/repo/applications/openthrottle-server/src',
          existsIn(workspace),
        ),
      ).toEqual(['/repo/applications/openthrottle-server/.env', '/repo/.env']);
    });
  });

  describe('when a file is missing', () => {
    it('skips a missing root .env (a container image has none)', () => {
      expect(
        resolveEnvFilePaths(
          '/app/build/src',
          existsIn(['/app/package.json', '/app/.env']),
        ),
      ).toEqual(['/app/.env']);
    });

    it('returns nothing outside a package', () => {
      expect(resolveEnvFilePaths('/tmp/x', existsIn([]))).toEqual([]);
    });
  });
});
