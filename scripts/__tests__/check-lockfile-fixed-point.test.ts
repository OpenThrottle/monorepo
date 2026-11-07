import { describe, expect, it } from 'vitest';

import {
  diffLockfiles,
  isEmptyDiff,
  parseLockfileEntries,
  pickProbeTarget,
} from '../check-lockfile-fixed-point.ts';

const LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      '@types/node':
        specifier: ^24.19.2
        version: 24.19.2

  packages/a:
    dependencies:
      '@openthrottle/b':
        specifier: workspace:^
        version: link:../b

snapshots:

  '@types/node@24.19.2':
    dependencies:
      undici-types: 7.24.6

  happy-dom@20.11.1:
    dependencies:
      '@types/node': 24.19.2
`;

const PROBE_KEY = 'importers › packages/probe';

describe('parseLockfileEntries', () => {
  it('keys each entry by its section and its two-space-indented header', () => {
    const entries = parseLockfileEntries(LOCKFILE);

    expect([...entries.keys()]).toEqual([
      'lockfileVersion',
      'importers',
      'importers › .',
      'importers › packages/a',
      'snapshots',
      "snapshots › '@types/node@24.19.2'",
      'snapshots › happy-dom@20.11.1',
    ]);
  });

  it('keeps the nested lines of an entry with that entry', () => {
    const entries = parseLockfileEntries(LOCKFILE);

    expect(entries.get('snapshots › happy-dom@20.11.1')).toContain(
      "'@types/node': 24.19.2",
    );
  });
});

describe('diffLockfiles', () => {
  it('reports nothing for identical lockfiles', () => {
    expect(isEmptyDiff(diffLockfiles(LOCKFILE, LOCKFILE))).toBe(true);
  });

  it('ignores blank-line-only differences', () => {
    const squeezed = LOCKFILE.replaceAll('\n\n', '\n');

    expect(isEmptyDiff(diffLockfiles(LOCKFILE, squeezed))).toBe(true);
  });

  it('names a snapshot whose resolved dependency moved', () => {
    const drifted = LOCKFILE.replace(
      "dependencies:\n      '@types/node': 24.19.2",
      "dependencies:\n      '@types/node': 26.1.2",
    );

    expect(diffLockfiles(LOCKFILE, drifted)).toEqual({
      added: [],
      changed: ['snapshots › happy-dom@20.11.1'],
      removed: [],
    });
  });

  it('reports added and removed entries', () => {
    const after = LOCKFILE.replace('happy-dom@20.11.1:', 'happy-dom@20.12.0:');

    expect(diffLockfiles(LOCKFILE, after)).toEqual({
      added: ['snapshots › happy-dom@20.12.0'],
      changed: [],
      removed: ['snapshots › happy-dom@20.11.1'],
    });
  });

  it('ignores the probe importer, and only it', () => {
    const probeBlock = `
  packages/probe:
    dependencies:
      '@openthrottle/b':
        specifier: workspace:^
        version: link:../b
`;
    const probedOnly = LOCKFILE.replace(
      '\nsnapshots:',
      `${probeBlock}\nsnapshots:`,
    );
    const probedAndDrifted = probedOnly.replace(
      "dependencies:\n      '@types/node': 24.19.2",
      "dependencies:\n      '@types/node': 26.1.2",
    );
    const ignored = new Set([PROBE_KEY]);

    expect(isEmptyDiff(diffLockfiles(LOCKFILE, probedOnly, ignored))).toBe(
      true,
    );
    expect(diffLockfiles(LOCKFILE, probedAndDrifted, ignored).changed).toEqual([
      'snapshots › happy-dom@20.11.1',
    ]);
  });
});

describe('pickProbeTarget', () => {
  it('picks the alphabetically first name', () => {
    expect(
      pickProbeTarget(['@openthrottle/z', '@openthrottle/a', '@tools/m']),
    ).toBe('@openthrottle/a');
  });

  it('returns undefined when there is no workspace package', () => {
    expect(pickProbeTarget([])).toBeUndefined();
  });
});
