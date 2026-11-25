import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  findSatisfyingNvmBin,
  parseVersion,
  satisfies,
} from '../check-node-engine.mjs';

/** The live range, so these cases fail if the declared floor drifts. */
const ENGINES_NODE: string = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
).engines.node;

/** Assert against the real range without repeating it in every case. */
const accepts = (version: string) => {
  const parsed = parseVersion(version);
  expect(parsed).not.toBeNull();
  return satisfies(parsed!, ENGINES_NODE);
};

describe('parseVersion', () => {
  it('parses a plain version', () => {
    expect(parseVersion('22.22.3')).toEqual([22, 22, 3]);
  });

  it('parses the v-prefixed form process.version uses', () => {
    expect(parseVersion('v24.15.0')).toEqual([24, 15, 0]);
  });

  it('defaults the omitted segments to zero', () => {
    expect(parseVersion('26')).toEqual([26, 0, 0]);
  });

  it('returns null for something that is not a version', () => {
    expect(parseVersion('latest')).toBeNull();
  });
});

describe('satisfies', () => {
  it('rejects a range it cannot parse rather than guessing', () => {
    expect(satisfies([24, 15, 0], '^24.15.0')).toBeNull();
  });

  it('requires every comparator in an alternative to hold', () => {
    expect(satisfies([23, 0, 0], '>=22.22.3 <23')).toBe(false);
  });
});

describe('the declared engines.node range', () => {
  it.each([
    ['20.19.0', false, 'the Nest 12 runtime floor, but below the runtime line'],
    [
      '22.22.3',
      false,
      'the Nest 12 CLI floor on the 22 line, but not the runtime line',
    ],
    ['24.22.2', false, 'the previous runtime line'],
    ['25.0.0', false, 'an unsupported odd release line'],
    ['26.0.0', true, 'the runtime line (distroless nodejs26)'],
    ['26.13.1', true, 'the version pinned in .nvmrc'],
    ['27.0.0', true, 'a later line'],
  ])('%s -> %s (%s)', (version, expected) => {
    expect(accepts(version)).toBe(expected);
  });

  it('accepts the version pinned in .nvmrc', () => {
    const pinned = readFileSync(
      join(import.meta.dirname, '..', '..', '.nvmrc'),
      'utf8',
    ).trim();
    expect(accepts(pinned)).toBe(true);
  });
});

describe('findSatisfyingNvmBin', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  const makeNvm = (versions: readonly string[]): string => {
    const nvmDir = mkdtempSync(join(tmpdir(), 'ot-check-node-'));
    roots.push(nvmDir);
    for (const version of versions) {
      const bin = join(nvmDir, 'versions', 'node', `v${version}`, 'bin');
      mkdirSync(bin, { recursive: true });
      writeFileSync(join(bin, 'node'), '');
    }

    return nvmDir;
  };

  it('prefers the installed .nvmrc pin', () => {
    const nvmDir = makeNvm(['26.1.0', '26.13.1', '27.0.0']);

    expect(findSatisfyingNvmBin('>=26', { nvmDir, pinned: 'v26.13.1\n' })).toBe(join(nvmDir, 'versions', 'node', 'v26.13.1', 'bin')); // prettier-ignore
  });

  it('falls back to the newest install that fits', () => {
    const nvmDir = makeNvm(['24.15.0', '26.1.0', '26.10.0']);

    expect(findSatisfyingNvmBin('>=26', { nvmDir, pinned: '26.13.1' })).toBe(join(nvmDir, 'versions', 'node', 'v26.10.0', 'bin')); // prettier-ignore
  });

  it('returns null when nothing installed fits', () => {
    const nvmDir = makeNvm(['24.15.0']);

    expect(
      findSatisfyingNvmBin('>=26', { nvmDir, pinned: '26.13.1' }),
    ).toBeNull();
  });
});
