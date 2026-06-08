import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashContent, hashFile } from '../hash.js';

describe('hashContent', () => {
  it('is deterministic for identical input', () => {
    expect(hashContent('hello world')).toBe(hashContent('hello world'));
  });

  it('differs for different input', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });

  it('produces a 64-character sha256 hex digest', () => {
    expect(hashContent('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ot-ide-hash-'));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('matches hashContent for the same bytes', async () => {
    const file = join(dir, 'file.txt');
    await writeFile(file, 'streamed content');

    expect(await hashFile(file)).toBe(hashContent('streamed content'));
  });
});
