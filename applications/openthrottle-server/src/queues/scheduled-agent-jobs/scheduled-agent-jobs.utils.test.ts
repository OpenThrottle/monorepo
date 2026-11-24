import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isDirectory } from './scheduled-agent-jobs.utils.ts';

describe('isDirectory', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'is-directory-'));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('is true for a directory', async () => {
    await expect(isDirectory(dir)).resolves.toBe(true);
  });

  it('is false for a file', async () => {
    const file = join(dir, 'a.txt');
    await writeFile(file, 'x');

    await expect(isDirectory(file)).resolves.toBe(false);
  });

  it('is false for a missing path', async () => {
    await expect(isDirectory(join(dir, 'missing'))).resolves.toBe(false);
  });
});
