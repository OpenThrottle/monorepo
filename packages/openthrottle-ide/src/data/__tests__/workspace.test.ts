import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashContent } from '../../utils/hash.js';
import { hashWorkspace, listFiles } from '../workspace.js';

describe('workspace enumeration', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-ws-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\nignored.txt\n');
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await writeFile(join(root, 'ignored.txt'), 'should not appear');
    await writeFile(join(root, 'dist', 'out.js'), 'compiled');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('lists tracked files and honors .gitignore', async () => {
    const files = await listFiles({ root });

    expect(files.sort()).toEqual(['.gitignore', 'src/a.ts', 'src/b.ts']);
  });

  it('applies additional exclude globs', async () => {
    const files = await listFiles({ exclude: ['*.ts'], root });

    expect(files).toEqual(['.gitignore']);
  });

  it('hashes each enumerated file', async () => {
    const hashes = await hashWorkspace({ root });
    const byPath = new Map(hashes.map((entry) => [entry.path, entry.hash]));

    expect(byPath.get('src/a.ts')).toBe(hashContent('export const a = 1;\n'));
    expect(byPath.size).toBe(3);
  });
});
