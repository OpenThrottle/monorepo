/**
 * Guard: every committed transcript is replayed by at least one test. A
 * fixture nothing replays is dead weight that still looks like coverage.
 *
 * A test "uses" a transcript by naming it literally —
 * `replayFixturePath('<backend>', '<stem>')` — in this package's tests. A
 * dynamic loop over every fixture would satisfy no one reading it, so this
 * guard deliberately does not count one.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const PACKAGE_DIR = join(import.meta.dirname, '..');
const FIXTURES_DIR = join(PACKAGE_DIR, 'fixtures');
const REFERENCE = /replayFixturePath\(\s*'([^']+)',\s*'([^']+)',?\s*\)/g;

const listFiles = (dir: string, suffix: string): string[] => {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith(suffix))
    .map((path) => join(dir, path));
};

const referenced = new Set(
  [
    ...listFiles(join(PACKAGE_DIR, 'src'), '.test.ts'),
    ...listFiles(join(PACKAGE_DIR, 'tests'), '.test.ts'),
  ].flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return [...text.matchAll(REFERENCE)].map(([, backend, stem]) => {
      return `${backend ?? ''}/${stem ?? ''}.ndjson`;
    });
  }),
);

const fixtures = listFiles(FIXTURES_DIR, '.ndjson')
  .map((path) => relative(FIXTURES_DIR, path))
  .toSorted();

describe('replay coverage', () => {
  it.each(fixtures)('%s is replayed by a test', (fixture) => {
    expect(referenced.has(fixture)).toBe(true);
  });
});
