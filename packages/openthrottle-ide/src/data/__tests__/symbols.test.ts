import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findDefinition, findReferences, listExports } from '../symbols.ts';
import { resetProjectCache } from '../ts-project.ts';

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
        "export { add, PI } from './math.ts';",
        "export type { Point } from './math.ts';",
        "export { default as Widget } from './widget.ts';",
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
    const widgetEntries = exports.filter((symbol) => symbol.name === 'Widget');

    // The declaring module's `default` and the barrel's `default as Widget`
    // must collapse to a single entry, not race on enumeration order.
    expect(widgetEntries).toHaveLength(1);
    expect(widgetEntries[0]).toMatchObject({
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

describe('symbol layer FS containment', () => {
  let outside: string;
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    outside = await mkdtemp(join(tmpdir(), 'ot-ide-outside-'));
    root = await mkdtemp(join(tmpdir(), 'ot-ide-contain-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' },
        include: ['src'],
      }),
    );
    await writeFile(
      join(root, 'src', 'inside.ts'),
      'export const inside = 1;\n',
    );
    // A symbol planted OUTSIDE the workspace; no resolver should ever read it.
    await writeFile(
      join(outside, 'secret.ts'),
      'export const SECRET = "leaked";\n',
    );
  });

  afterEach(async () => {
    resetProjectCache();
    await rm(root, { force: true, recursive: true });
    await rm(outside, { force: true, recursive: true });
  });

  it('does not enumerate symbols from files outside the workspace root', async () => {
    const exports = await listExports({ root });
    const names = exports.map((symbol) => symbol.name);

    expect(names).toContain('inside');
    expect(names).not.toContain('SECRET');
  });

  it('does not resolve a by-name symbol that only exists outside the root', async () => {
    // `SECRET` is declared only in the out-of-root file; the by-name scan must
    // not reach across the boundary to find it.
    const definitions = await findDefinition({ root }, { name: 'SECRET' });
    const references = await findReferences({ root }, { name: 'SECRET' });

    expect(definitions).toEqual([]);
    expect(references).toEqual([]);
  });

  it('returns an empty array for a traversal/absolute position path', async () => {
    const traversal = await listExports({ root });

    // Sanity: a position target escaping via `../` or an absolute segment is
    // rejected by the resolver and yields nothing — proving the lexical guard
    // is engaged before any read of the planted out-of-root file.
    const escapedDefinition = await findDefinition(
      { root },
      { column: 1, line: 1, path: join('..', 'secret.ts') },
    );
    const absoluteDefinition = await findDefinition(
      { root },
      { column: 1, line: 1, path: join(outside, 'secret.ts') },
    );

    expect(traversal.map((symbol) => symbol.name)).not.toContain('SECRET');
    expect(escapedDefinition).toEqual([]);
    expect(absoluteDefinition).toEqual([]);
  });
});

// Force ripgrep to enumerate a file that no longer exists on disk, reproducing
// the TOCTOU window where a path is listed and then deleted before ts-morph
// reads it. The real binary won't enumerate a vanished file deterministically,
// so we drive the contract via the module boundary instead.
vi.mock('../../utils/ripgrep.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/ripgrep.js')>(
    '../../utils/ripgrep.js',
  );

  return {
    ...actual,
    runRipgrep: vi.fn(actual.runRipgrep),
  };
});

describe('addWorkspaceSourceFiles TOCTOU', () => {
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    vi.clearAllMocks();
    root = await mkdtemp(join(tmpdir(), 'ot-ide-toctou-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' },
        include: ['src'],
      }),
    );
    await writeFile(join(root, 'src', 'keep.ts'), 'export const keep = 1;\n');
  });

  afterEach(async () => {
    resetProjectCache();
    vi.restoreAllMocks();
    await rm(root, { force: true, recursive: true });
  });

  it('never throws when an enumerated file vanishes before it is added', async () => {
    const { runRipgrep } = await import('../../utils/ripgrep.js');
    const mocked = vi.mocked(runRipgrep);
    // ripgrep "saw" a doomed file that was deleted before ts-morph reads it;
    // the non-throwing add must skip the missing path and still surface the
    // surviving file rather than rejecting the whole call with ENOENT.
    mocked.mockResolvedValueOnce({ stdout: 'src/keep.ts\nsrc/doomed.ts\n' });

    const exports = await listExports({ root });
    const names = exports.map((symbol) => symbol.name);

    expect(names).toContain('keep');
    expect(names).not.toContain('doomed');
  });
});
