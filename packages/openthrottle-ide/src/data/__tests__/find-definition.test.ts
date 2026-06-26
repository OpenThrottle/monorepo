import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findDefinition } from '../symbols.ts';
import { resetProjectCache } from '../ts-project.ts';

describe('findDefinition', () => {
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    root = await mkdtemp(join(tmpdir(), 'ot-ide-def-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' },
        include: ['src'],
      }),
    );
    await writeFile(
      join(root, 'src', 'math.ts'),
      [
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
        'const sum = add(1, 2);',
        'export const value = sum;',
      ].join('\n'),
    );
    await writeFile(
      join(root, 'src', 'app.ts'),
      [
        "import { add } from './math.ts';",
        'export const total = add(3, 4);',
      ].join('\n'),
    );
  });

  afterEach(async () => {
    resetProjectCache();
    await rm(root, { force: true, recursive: true });
  });

  it('resolves a same-file definition from a usage position', async () => {
    // `add` usage on line 4: `const sum = add(1, 2);` (1-based column 13).
    const definitions = await findDefinition(
      { root },
      { column: 13, line: 4, path: 'src/math.ts' },
    );

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({
      kind: 'function',
      line: 1,
      name: 'add',
      path: 'src/math.ts',
    });
  });

  it('resolves an imported definition across files', async () => {
    // `add` usage on line 2: `export const total = add(3, 4);` (column 22).
    const definitions = await findDefinition(
      { root },
      { column: 22, line: 2, path: 'src/app.ts' },
    );

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({
      line: 1,
      name: 'add',
      path: 'src/math.ts',
    });
  });

  it('resolves by symbol name', async () => {
    const definitions = await findDefinition({ root }, { name: 'add' });

    expect(definitions).toEqual([
      expect.objectContaining({
        kind: 'function',
        line: 1,
        name: 'add',
        path: 'src/math.ts',
      }),
    ]);
  });

  it('returns an empty array for a path that escapes the workspace root', async () => {
    const traversal = await findDefinition(
      { root },
      { column: 1, line: 1, path: '../../../../../../etc/passwd' },
    );
    const absolute = await findDefinition(
      { root },
      { column: 1, line: 1, path: '/etc/passwd' },
    );

    expect(traversal).toEqual([]);
    expect(absolute).toEqual([]);
  });

  it('returns an empty array when nothing resolves', async () => {
    const onWhitespace = await findDefinition(
      { root },
      { column: 1, line: 2, path: 'src/math.ts' },
    );
    const unknownName = await findDefinition({ root }, { name: 'nope' });

    expect(onWhitespace).toEqual([]);
    expect(unknownName).toEqual([]);
  });
});
