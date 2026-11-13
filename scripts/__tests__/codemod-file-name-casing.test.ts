import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'; // prettier-ignore
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isInScopePath,
  planRenames,
  primaryExport,
  RENAME_STATUS,
  runCodemod,
  scanExports,
  splitFileName,
  targetFileName,
} from '../codemod-file-name-casing.ts';

let root: string;

/** Write a file under the fixture workspace, creating parents as needed. */
const write = (relativePath: string, contents: string): void => {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
};

const read = (relativePath: string): string => {
  return readFileSync(path.join(root, relativePath), 'utf8');
};

const exists = (relativePath: string): boolean => {
  return existsSync(path.join(root, relativePath));
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'codemod-casing-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe('splitFileName', () => {
  it('keeps a .server suffix apart from the stem', () => {
    expect(splitFileName('get-user.server.ts')).toEqual({ ext: '.ts', stem: 'get-user', suffix: '.server' }); // prettier-ignore
  });

  it('has an empty suffix for a plain module', () => {
    expect(splitFileName('get-user.tsx')).toEqual({ ext: '.tsx', stem: 'get-user', suffix: '' }); // prettier-ignore
  });
});

describe('isInScopePath', () => {
  it.each([
    ['packages/p/src/utils/get-foo.ts', true],
    ['packages/p/src/utils/get-foo.server.ts', true],
    ['packages/p/src/components/my-button.tsx', true],
    ['packages/p/scripts/utils/get-foo.ts', true],
    ['packages/p/src/utils/getFoo.ts', false],
    ['packages/p/src/utils/foo.ts', false],
    ['packages/p/src/utils/get-foo.test.ts', false],
    ['packages/p/src/data/data.copy-text.ts', false],
    ['packages/p/src/data/mock.some-thing.ts', false],
    ['applications/a/src/auth-guard/auth-guard.service.ts', false],
    ['packages/p/vite-plugin.config.ts', false],
    ['packages/p/src/types/my-types.d.ts', false],
    ['applications/a/app/routes/plans.new-plan.tsx', false],
    ['applications/a/app/routes/some-route/helper-fn.ts', false],
    ['applications/a/app/__generated__/some-types.ts', false],
    ['applications/a/scripts/stage-app.ts', false],
    ['packages/p/src/utils/get-foo.js', false],
  ])('%s -> %s', (relativePath, expected) => {
    expect(isInScopePath(relativePath)).toBe(expected);
  });
});

describe('scanExports', () => {
  it('ignores type-only exports alongside the one value', () => {
    const scan = scanExports(
      'a.ts',
      `
      export interface GetFooOptions { readonly a: string }
      export type GetFooResult = string;
      export type { Other } from './other';
      export const getFoo = (): string => { return 'x'; };
    `,
    );
    expect(scan).toEqual({ kind: 'values', names: ['getFoo'] });
  });

  it('counts every value export', () => {
    const scan = scanExports(
      'a.ts',
      `
      export function a() {}
      export class B {}
      export const c = 1, d = 2;
      const e = 3;
      export { e };
    `,
    );
    expect(scan).toEqual({ kind: 'values', names: ['a', 'B', 'c', 'd', 'e'] });
  });

  it.each([
    ['export * from "./x";', 'export *'],
    ['export default function f() {}', 'export default'],
    ['const f = 1; export default f;', 'export default / export ='],
    ['export const { a } = obj;', 'destructured export'],
    ['export namespace N { export const a = 1; }', 'exported namespace'],
  ])('is opaque for %s', (source, reason) => {
    expect(scanExports('a.ts', source)).toEqual({ kind: 'opaque', reason });
  });
});

describe('primaryExport', () => {
  it('is the only value export', () => {
    expect(primaryExport('anything', ['getFoo'])).toBe('getFoo');
  });

  it('is the non-constant export the stem names, among several', () => {
    expect(primaryExport('resolve-thing', ['THING_KINDS', 'resolveThing', 'helper'])).toBe('resolveThing'); // prettier-ignore
  });

  it('is undefined for a bucket, and never a constant', () => {
    expect(primaryExport('format', ['formatDate', 'formatBytes'])).toBeUndefined(); // prettier-ignore
    expect(primaryExport('thing-kinds', ['THING_KINDS', 'other'])).toBeUndefined(); // prettier-ignore
  });
});

describe('targetFileName', () => {
  it('mirrors the export exactly and keeps the suffix', () => {
    expect(targetFileName('get-url-parts.server.ts', 'getURLParts')).toBe('getURLParts.server.ts'); // prettier-ignore
  });
});

describe('planRenames', () => {
  it('classifies renames, constants and conflicts', () => {
    write('packages/p/src/utils/get-foo.ts', 'export const getFoo = () => { return 1; };'); // prettier-ignore
    write('packages/p/src/utils/form-field-kind.ts', 'export const getFormFieldKind = () => { return 1; };'); // prettier-ignore
    write('packages/p/src/config/cms-status.ts', `export const CMS_STATUS = { a: 'a' } as const;`); // prettier-ignore
    write('packages/p/src/utils/two-things.ts', 'export const a = 1; export const b = 2;'); // prettier-ignore
    write('packages/p/src/utils/do-bar.ts', 'export const doBar = 1;');
    write('packages/p/src/utils/DoBar.tsx', 'export const DoBar = 1;');

    const byFrom = new Map(planRenames(root, 'packages/p').map((candidate) => [path.basename(candidate.from), candidate])); // prettier-ignore

    expect(byFrom.get('get-foo.ts')).toMatchObject({ status: RENAME_STATUS.rename, stemMatches: true, to: 'packages/p/src/utils/getFoo.ts' }); // prettier-ignore
    expect(byFrom.get('form-field-kind.ts')).toMatchObject({ status: RENAME_STATUS.rename, stemMatches: false, to: 'packages/p/src/utils/getFormFieldKind.ts' }); // prettier-ignore
    expect(byFrom.get('cms-status.ts')).toMatchObject({ status: RENAME_STATUS.constant }); // prettier-ignore
    expect(byFrom.get('do-bar.ts')).toMatchObject({ status: RENAME_STATUS.conflict }); // prettier-ignore
    expect(byFrom.has('two-things.ts')).toBe(false);
  });

  it('renames a multi-export file for the export its stem names, and leaves a bucket alone', () => {
    write('packages/p/src/utils/resolve-thing.ts', `export const THING_KINDS = ['a'] as const; export const resolveThing = () => { return 1; }; export const helper = 2;`); // prettier-ignore
    write('packages/p/src/utils/format.ts', 'export const formatDate = 1; export const formatBytes = 2;'); // prettier-ignore
    write('packages/p/src/utils/thing-kinds.ts', `export const THING_KINDS = ['a'] as const; export const other = 1;`); // prettier-ignore

    const byFrom = new Map(planRenames(root, 'packages/p').map((candidate) => [path.basename(candidate.from), candidate])); // prettier-ignore

    expect(byFrom.get('resolve-thing.ts')).toMatchObject({ exportName: 'resolveThing', status: RENAME_STATUS.rename, to: 'packages/p/src/utils/resolveThing.ts' }); // prettier-ignore
    expect(byFrom.has('format.ts')).toBe(false);
    expect(byFrom.has('thing-kinds.ts')).toBe(false);
  });

  it('moves companions beside it and in __tests__', () => {
    write('packages/p/src/utils/get-foo.ts', 'export const getFoo = 1;');
    write('packages/p/src/utils/get-foo.stories.tsx', '');
    write('packages/p/src/utils/__tests__/get-foo.test.ts', '');
    write('packages/p/src/utils/get-foo-bar.ts', 'export const getFooBar = 1;');

    const candidate = planRenames(root, 'packages/p').find((entry) => entry.from.endsWith('get-foo.ts')); // prettier-ignore

    expect(candidate?.companions).toEqual([
      { from: 'packages/p/src/utils/get-foo.stories.tsx', to: 'packages/p/src/utils/getFoo.stories.tsx' }, // prettier-ignore
      { from: 'packages/p/src/utils/__tests__/get-foo.test.ts', to: 'packages/p/src/utils/__tests__/getFoo.test.ts' }, // prettier-ignore
    ]);
  });
});

describe('runCodemod --write', () => {
  beforeEach(() => {
    write('applications/a/tsconfig.json', JSON.stringify({ compilerOptions: { paths: { '~/*': ['./app/*'] } } })); // prettier-ignore
    write('applications/a/app/utils/get-foo.ts', 'export const getFoo = () => { return 1; };'); // prettier-ignore
    write('applications/a/app/utils/__tests__/get-foo.test.ts', `import { getFoo } from '../get-foo';\nvi.mock('../get-foo.ts');\n`); // prettier-ignore
    write('applications/a/app/global/thing.tsx', `import { getFoo } from '~/utils/get-foo';\nconst lazy = import('../utils/get-foo.js');\nconst label = 'get-foo';\n`); // prettier-ignore
    write('applications/a/app/utils/index.ts', `export { getFoo } from './get-foo.ts';\n`); // prettier-ignore
    write('applications/a/app/other/get-foo.ts', 'export const getFoo = 2;');
    write('applications/b/app/consumer.ts', `import { x } from '~/utils/get-foo';\n`); // prettier-ignore
    write('applications/a/AGENTS.md', 'See [app/utils/get-foo.ts](app/utils/get-foo.ts) and other/app/utils/get-foo.ts and mcp-get-foo.ts.\n'); // prettier-ignore
    write('docs/notes.md', 'See applications/a/app/utils/get-foo.ts and get-foo.ts.\n'); // prettier-ignore
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
  });

  it('git-mvs the file and its companions', () => {
    runCodemod(root, 'applications/a', { write: true });

    expect(exists('applications/a/app/utils/getFoo.ts')).toBe(true);
    expect(exists('applications/a/app/utils/get-foo.ts')).toBe(false);
    expect(exists('applications/a/app/utils/__tests__/getFoo.test.ts')).toBe(true); // prettier-ignore
  });

  it('rewrites relative, alias, dynamic and vi.mock specifiers, keeping their extension form', () => {
    runCodemod(root, 'applications/a', { write: true });

    expect(read('applications/a/app/utils/__tests__/getFoo.test.ts')).toBe(`import { getFoo } from '../getFoo';\nvi.mock('../getFoo.ts');\n`); // prettier-ignore
    expect(read('applications/a/app/global/thing.tsx')).toBe(`import { getFoo } from '~/utils/getFoo';\nconst lazy = import('../utils/getFoo.js');\nconst label = 'get-foo';\n`); // prettier-ignore
    expect(read('applications/a/app/utils/index.ts')).toBe(`export { getFoo } from './getFoo.ts';\n`); // prettier-ignore
  });

  it('only rewrites specifiers that resolve to the renamed file', () => {
    runCodemod(root, 'applications/a', { write: true });

    // A different project's `~` points at its own app/, which has no such file.
    expect(read('applications/b/app/consumer.ts')).toBe(`import { x } from '~/utils/get-foo';\n`); // prettier-ignore
  });

  it('rewrites repo-relative paths in docs and reports bare basenames', () => {
    const report = runCodemod(root, 'applications/a', { write: true });

    expect(read('docs/notes.md')).toBe('See applications/a/app/utils/getFoo.ts and get-foo.ts.\n'); // prettier-ignore
    expect(report.staleMentions).toEqual([{ file: 'docs/notes.md', line: 1, text: 'See applications/a/app/utils/getFoo.ts and get-foo.ts.' }]); // prettier-ignore
  });

  it('rewrites paths relative to the doc, only where a path starts', () => {
    const report = runCodemod(root, 'applications/a', { write: true });

    expect(read('applications/a/AGENTS.md')).toBe('See [app/utils/getFoo.ts](app/utils/getFoo.ts) and other/app/utils/get-foo.ts and mcp-get-foo.ts.\n'); // prettier-ignore
    expect(report.staleMentions.map((mention) => mention.file)).not.toContain('applications/a/AGENTS.md'); // prettier-ignore
  });

  it('changes nothing on a dry run', () => {
    const report = runCodemod(root, 'applications/a', { write: false });

    expect(report.edits.length).toBeGreaterThan(0);
    expect(exists('applications/a/app/utils/get-foo.ts')).toBe(true);
    expect(read('applications/a/app/utils/index.ts')).toBe(`export { getFoo } from './get-foo.ts';\n`); // prettier-ignore
  });
});
