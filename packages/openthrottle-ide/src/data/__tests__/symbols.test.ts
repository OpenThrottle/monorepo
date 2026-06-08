import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listExports } from '../symbols.js';
import { resetProjectCache } from '../ts-project.js';

describe('listExports', () => {
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    root = await mkdtemp(join(tmpdir(), 'ot-ide-symbols-'));
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
        'export const PI = 3.14159;',
        'export interface Point {',
        '  x: number;',
        '  y: number;',
        '}',
        'export type ID = string;',
      ].join('\n'),
    );
    await writeFile(
      join(root, 'src', 'widget.ts'),
      'export default class Widget {}\n',
    );
    // Barrel that re-exports from math.ts; origins must resolve to math.ts.
    await writeFile(
      join(root, 'src', 'index.ts'),
      [
        "export { add, PI } from './math.js';",
        "export type { Point } from './math.js';",
        "export { default as Widget } from './widget.js';",
      ].join('\n'),
    );
  });

  afterEach(async () => {
    resetProjectCache();
    await rm(root, { force: true, recursive: true });
  });

  it('reports exported symbols with kind, path, and line', async () => {
    const exports = await listExports({ root });
    const byName = new Map(exports.map((symbol) => [symbol.name, symbol]));

    expect(byName.get('add')).toMatchObject({
      isDefault: false,
      kind: 'function',
      line: 1,
      path: 'src/math.ts',
    });
    expect(byName.get('PI')?.kind).toBe('const');
    expect(byName.get('Point')?.kind).toBe('interface');
    expect(byName.get('ID')?.kind).toBe('type');
  });

  it('resolves barrel re-exports to the original declaration, without duplicates', async () => {
    const exports = await listExports({ root });
    const addEntries = exports.filter((symbol) => symbol.name === 'add');

    expect(addEntries).toHaveLength(1);
    expect(addEntries[0]?.path).toBe('src/math.ts');
  });

  it('marks default exports and reports the declared name', async () => {
    const exports = await listExports({ root });
    const widget = exports.find((symbol) => symbol.name === 'Widget');

    expect(widget).toMatchObject({
      isDefault: true,
      kind: 'class',
      path: 'src/widget.ts',
    });
  });

  it('scopes enumeration with a glob filter', async () => {
    const exports = await listExports({ root }, { globs: ['**/math.ts'] });
    const names = exports.map((symbol) => symbol.name).sort();

    expect(names).toEqual(['ID', 'PI', 'Point', 'add']);
  });
});
