import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseVersion, satisfies } from '../check-node-engine.mjs';

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
    ['22.22.3', true, 'the exact Nest 12 CLI floor on the 22 line'],
    ['22.22.4', true, 'above the 22 floor'],
    ['22.12.0', false, 'the runtime floor, but below the CLI floor'],
    ['23.0.0', false, 'an unsupported odd release line'],
    ['24.14.0', false, 'below the 24 CLI floor'],
    ['24.15.0', true, 'the exact Nest 12 CLI floor on the 24 line'],
    ['24.18.0', true, 'the version pinned in .nvmrc'],
    ['25.0.0', false, 'an unsupported odd release line'],
    ['26.0.0', true, 'the next supported line'],
    ['20.19.0', false, 'the Nest 12 runtime floor, but no CLI support'],
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
