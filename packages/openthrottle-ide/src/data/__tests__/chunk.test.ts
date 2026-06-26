import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashContent } from '../../utils/hash.ts';
import {
  chunkFile,
  chunkWorkspace,
  DEFAULT_CHUNK_WINDOW_LINES,
} from '../chunk.ts';

describe('chunkFile', () => {
  it('chunks TypeScript at top-level declaration boundaries (AST-aware)', () => {
    const content = [
      "import { z } from 'zod';",
      '',
      '/** Adds two numbers. */',
      'export function add(a: number, b: number): number {',
      '  return a + b;',
      '}',
      '',
      'export interface Point {',
      '  x: number;',
      '  y: number;',
      '}',
    ].join('\n');

    const chunks = chunkFile('src/math.ts', content);

    // import (glue) + add + Point
    expect(chunks).toHaveLength(3);

    const add = chunks.find((chunk) => chunk.content.includes('function add'));
    expect(add).toBeDefined();
    // Leading JSDoc is included with the declaration.
    expect(add?.content).toContain('/** Adds two numbers. */');
    expect(add?.startLine).toBe(3);
    expect(add?.endLine).toBe(6);

    const point = chunks.find((chunk) =>
      chunk.content.includes('interface Point'),
    );
    expect(point?.startLine).toBe(8);
    expect(point?.endLine).toBe(11);
  });

  it('derives a stable, content-derived id and gives every chunk a unique id', () => {
    const content = 'export const a = 1;\nexport const b = 2;\n';
    const chunks = chunkFile('src/consts.ts', content);

    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect(chunk.id).toBe(hashContent(`${chunk.path}\n${chunk.content}`));
    }
    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(chunks.length);
  });

  it('keeps a chunk id stable when surrounding code shifts its line numbers', () => {
    const fn = [
      'export function greet(): string {',
      "  return 'hi';",
      '}',
    ].join('\n');
    const before = chunkFile('src/a.ts', fn);
    const after = chunkFile('src/a.ts', `// a new leading comment\n\n${fn}`);

    const greetBefore = before.find((chunk) => chunk.content === fn);
    const greetAfter = after.find((chunk) => chunk.content === fn);

    expect(greetBefore?.id).toBeDefined();
    expect(greetAfter?.id).toBe(greetBefore?.id);
    // ...even though its line range moved.
    expect(greetAfter?.startLine).not.toBe(greetBefore?.startLine);
  });

  it('falls back to fixed line-windows for non-script files', () => {
    const lines = Array.from(
      { length: DEFAULT_CHUNK_WINDOW_LINES + 5 },
      (_, index) => `line ${index + 1}`,
    );
    const chunks = chunkFile('docs/notes.md', lines.join('\n'));

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.startLine).toBe(1);
    expect(chunks[0]?.endLine).toBe(DEFAULT_CHUNK_WINDOW_LINES);
    expect(chunks[1]?.startLine).toBe(DEFAULT_CHUNK_WINDOW_LINES + 1);
    expect(chunks[1]?.endLine).toBe(DEFAULT_CHUNK_WINDOW_LINES + 5);
  });

  it('falls back to line-windows for a script file with no top-level declarations', () => {
    const content = '// just a comment\n/* nothing declared here */\n';
    const chunks = chunkFile('src/empty.ts', content, { windowLines: 10 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.startLine).toBe(1);
  });

  it('returns no chunks for empty content', () => {
    expect(chunkFile('src/empty.ts', '')).toEqual([]);
  });
});

describe('chunkWorkspace', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-chunk-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'math.ts'),
      'export function add(a: number, b: number): number {\n  return a + b;\n}\n',
    );
    await writeFile(join(root, 'README.md'), 'line a\nline b\nline c\n');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('chunks every enumerated file with workspace-relative paths', async () => {
    const chunks = await chunkWorkspace({ root });
    const paths = new Set(chunks.map((chunk) => chunk.path));

    expect(paths.has('src/math.ts')).toBe(true);
    expect(paths.has('README.md')).toBe(true);
    expect(chunks.every((chunk) => chunk.id.length > 0)).toBe(true);
  });
});
