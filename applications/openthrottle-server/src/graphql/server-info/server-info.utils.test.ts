/**
 * @description Unit tests for readServerVersion: walks up to the openthrottle-server manifest and
 * follows its version.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readServerVersion } from './server-info.utils.ts';

describe('readServerVersion', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'server-info-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('finds the server manifest above a nested build directory', () => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'openthrottle-server', version: '7.8.9' }),
    );
    const nested = join(root, 'build', 'src');
    mkdirSync(nested, { recursive: true });

    expect(readServerVersion(nested)).toBe('7.8.9');
  });

  it('skips a differently named package.json on the way up', () => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'openthrottle-server', version: '1.2.3' }),
    );
    const inner = join(root, 'inner');
    mkdirSync(inner);
    writeFileSync(
      join(inner, 'package.json'),
      JSON.stringify({ name: 'something-else', version: '0.0.1' }),
    );

    expect(readServerVersion(inner)).toBe('1.2.3');
  });

  it('throws when no server manifest exists above the directory', () => {
    expect(() => readServerVersion(root)).toThrow(/No openthrottle-server/);
  });
});
