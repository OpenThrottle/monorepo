import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

  it('answers true on a timeout', async () => {
    const instant = createFsGlobMatcher({ maxEntries: 1000, timeoutMs: 0 });
    expect(await instant('packages/**/*.nope', root)).toBe(true);
  });
});
