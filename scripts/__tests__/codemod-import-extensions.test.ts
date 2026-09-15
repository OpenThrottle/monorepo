import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'; // prettier-ignore
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  codemodProject,
  needsExtension,
  resolveSpecifier,
} from '../codemod-import-extensions.ts';

let root: string;

/** Write a file under the fixture project, creating parents as needed. */
const write = (relativePath: string, contents: string): void => {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
};

const read = (relativePath: string): string =>
  readFileSync(path.join(root, relativePath), 'utf8');

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'codemod-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe('needsExtension', () => {
  it.each([
    ['./sibling', true, 'extensionless relative'],
    ['../parent/thing', true, 'extensionless parent-relative'],
    [
      './sibling.ts',
      false,
      'already suffixed — this is what makes it idempotent',
    ],
    ['./data.json', false, 'json is handled by resolveJsonModule'],
    ['@nestjs/common', false, 'bare package specifier'],
    ['node:path', false, 'builtin'],
    ['rxjs', false, 'bare package'],
  ])('%s -> %s (%s)', (specifier, expected) => {
    expect(needsExtension(specifier)).toBe(expected);
  });
});

describe('resolveSpecifier', () => {
  it('resolves a sibling module', () => {
    write('src/sibling.ts', 'export const a = 1;');
    expect(resolveSpecifier(path.join(root, 'src'), './sibling')).toBe('./sibling.ts'); // prettier-ignore
  });

  it('resolves a directory to its index barrel', () => {
    write('src/barrel/index.ts', 'export const b = 2;');
    expect(resolveSpecifier(path.join(root, 'src'), './barrel')).toBe('./barrel/index.ts'); // prettier-ignore
  });

  it('prefers a file over a same-named directory, matching Node precedence', () => {
    write('src/thing.ts', 'export const a = 1;');
    write('src/thing/index.ts', 'export const b = 2;');
    expect(resolveSpecifier(path.join(root, 'src'), './thing')).toBe('./thing.ts'); // prettier-ignore
  });

  it('returns null rather than guessing when nothing matches', () => {
    expect(resolveSpecifier(path.join(root, 'src'), './nope')).toBeNull();
  });
});

describe('codemodProject', () => {
  it('rewrites every specifier form and leaves the rest alone', () => {
    write('src/sibling.ts', 'export const a = 1;');
    write('src/barrel/index.ts', 'export const b = 2;');
    write('src/dynamic.ts', 'export const d = 4;');
    write('src/types.ts', 'export type T = string;');
    write('src/data.json', '{"k":1}');
    write(
      'src/main.ts',
      [
        "import { a } from './sibling';",
        "import type { T } from './types';",
        "export * from './barrel';",
        "export { a as renamed } from './sibling';",
        "import data from './data.json';",
        "import { join } from 'node:path';",
        "import { Injectable } from '@nestjs/common';",
        "const lazy = await import('./dynamic');",
        'export { data, join, Injectable, lazy };',
      ].join('\n'),
    );

    const report = codemodProject(root, { write: true });
    const out = read('src/main.ts');

    expect(out).toContain("from './sibling.ts'");
    expect(out).toContain("from './types.ts'");
    expect(out).toContain("from './barrel/index.ts'");
    expect(out).toContain("import('./dynamic.ts')");
    // Untouched:
    expect(out).toContain("from './data.json'");
    expect(out).toContain("from 'node:path'");
    expect(out).toContain("from '@nestjs/common'");
    expect(report.unresolved).toEqual([]);
    expect(report.rewritten).toBe(5);
  });

  it('is idempotent — a second run rewrites nothing', () => {
    write('src/sibling.ts', 'export const a = 1;');
    write('src/main.ts', "import { a } from './sibling';\nexport { a };");

    const first = codemodProject(root, { write: true });
    const second = codemodProject(root, { write: true });

    expect(first.rewritten).toBe(1);
    expect(second.rewritten).toBe(0);
    expect(second.filesChanged).toBe(0);
    expect(read('src/main.ts')).toContain("from './sibling.ts'");
  });

  it('reports an unresolvable specifier and leaves it untouched', () => {
    write(
      'src/main.ts',
      "import { a } from './does-not-exist';\nexport { a };",
    );

    const report = codemodProject(root, { write: true });

    expect(report.rewritten).toBe(0);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]?.specifier).toBe('./does-not-exist');
    expect(report.unresolved[0]?.line).toBe(1);
    expect(read('src/main.ts')).toContain("from './does-not-exist'");
  });

  it('does not rewrite a path-looking string that is not a module specifier', () => {
    write('src/sibling.ts', 'export const a = 1;');
    write(
      'src/main.ts',
      ["// import { a } from './sibling';", "export const label = './sibling';"].join('\n'), // prettier-ignore
    );

    const report = codemodProject(root, { write: true });

    expect(report.rewritten).toBe(0);
    expect(read('src/main.ts')).toContain("export const label = './sibling';");
  });

  it('makes no writes in dry-run mode but still counts', () => {
    write('src/sibling.ts', 'export const a = 1;');
    write('src/main.ts', "import { a } from './sibling';\nexport { a };");

    const report = codemodProject(root, { write: false });

    expect(report.rewritten).toBe(1);
    expect(read('src/main.ts')).toContain("from './sibling';");
  });
});
