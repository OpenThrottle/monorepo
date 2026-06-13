import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findReferences } from '../symbols.js';
import { resetProjectCache } from '../ts-project.js';

describe('findReferences', () => {
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    root = await mkdtemp(join(tmpdir(), 'ot-ide-refs-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' },
        include: ['src'],
      }),
    );
    await writeFile(
      join(root, 'src', 'counter.ts'),
      [
        'export let count = 0;',
        'export function bump(): void {',
        '  count = count + 1;',
        '}',
      ].join('\n'),
    );
    await writeFile(
      join(root, 'src', 'app.ts'),
      [
        "import { count } from './counter.js';",
        'export const current = count;',
      ].join('\n'),
    );
  });

  afterEach(async () => {
    resetProjectCache();
    await rm(root, { force: true, recursive: true });
  });

  it('finds references across files, including the declaration', async () => {
    // `count` declaration on line 1: `export let count = 0;` (column 12).
    const references = await findReferences(
      { root },
      { column: 12, line: 1, path: 'src/counter.ts' },
    );
    const files = new Set(references.map((reference) => reference.path));

    expect(files).toEqual(new Set(['src/app.ts', 'src/counter.ts']));
    // Declaration site is included.
    expect(references).toContainEqual(
      expect.objectContaining({ column: 12, line: 1, path: 'src/counter.ts' }),
    );
    // Cross-file usage in app.ts is included.
    expect(references).toContainEqual(
      expect.objectContaining({ line: 2, path: 'src/app.ts' }),
    );
  });

  it('distinguishes a write from reads', async () => {
    const references = await findReferences({ root }, { name: 'count' });
    // `count = count + 1;` on line 3 of counter.ts: the LHS writes, the RHS reads.
    const lineThree = references.filter(
      (reference) =>
        reference.path === 'src/counter.ts' && reference.line === 3,
    );

    expect(lineThree.some((reference) => reference.isWrite === true)).toBe(
      true,
    );
    expect(lineThree.some((reference) => reference.isWrite === false)).toBe(
      true,
    );
  });

  it('returns an empty array when nothing resolves', async () => {
    const references = await findReferences({ root }, { name: 'missing' });

    expect(references).toEqual([]);
  });
});
