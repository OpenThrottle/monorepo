import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createFsGlobMatcher,
  globSegmentToRegExp,
} from '../fs-glob-matcher.ts';

let root = '';

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-glob-'));
  const files = [
    'applications/server/Dockerfile.prod',
    'packages/a/src/index.ts',
    'packages/b/src/deep/util.ts',
    'packages/.hidden/x.ts',
    'notes [draft].md',
    '.env',
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '');
  }
});

afterAll(() => {
  fs.rmSync(root, { force: true, recursive: true });
});

const matcher = createFsGlobMatcher({ maxEntries: 1000, timeoutMs: 2000 });

describe('globSegmentToRegExp', () => {
  it('is null for a literal segment', () => {
    expect(globSegmentToRegExp('src')).toBeNull();
    expect(globSegmentToRegExp('a\\*b')).toBeNull();
  });

  it('translates *, ? and bracket classes', () => {
    const regex = globSegmentToRegExp('[!x]?le*.ts');
    expect(regex?.test('file-a.ts')).toBe(true);
    expect(regex?.test('xile.ts')).toBe(false);
  });
});

describe('createFsGlobMatcher', () => {
  it.each([
    'applications/server/Dockerfile*',
    'packages/*/src/*.ts',
    'packages/**/*.ts',
    'notes \\[draft\\].md',
    '.e*',
  ])('matches %s', async (pattern) => {
    expect(await matcher(pattern, root)).toBe(true);
  });

  it.each([
    'applications/openthrottle-server/Dockerfile*',
    'packages/*/src/*.tsx',
    'packages/*/x.ts',
    '*.env',
    'notes [draft].md',
  ])('does not match %s', async (pattern) => {
    expect(await matcher(pattern, root)).toBe(false);
  });

  it('resolves an absolute pattern from the root', async () => {
    expect(await matcher(`${root}/packages/*/src`, '/')).toBe(true);
  });

  it('answers true once the entry budget is spent', async () => {
    const tight = createFsGlobMatcher({ maxEntries: 1, timeoutMs: 2000 });
    expect(await tight('packages/**/*.nope', root)).toBe(true);
  });

  describe('when the walk outlasts the timeout', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('answers true', async () => {
      // A walk whose reads never settle, so the timer is the only way out —
      // a real walk over this tiny tree can beat even a 0ms timer.
      const never = new Promise<never>(() => {});
      const readdir = vi.spyOn(fsPromises, 'readdir').mockReturnValue(never);
      const stat = vi.spyOn(fsPromises, 'stat').mockReturnValue(never);
      const timed = createFsGlobMatcher({ maxEntries: 1000, timeoutMs: 10 });

      expect(await timed('packages/**/*.nope', root)).toBe(true);
      expect(
        stat.mock.calls.length + readdir.mock.calls.length,
      ).toBeGreaterThan(0);
    });
  });
});
