import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getFilesByExtension } from './files';

let root: string;

const write = (relativePath: string, content = ''): void => {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, 'utf-8');
};

const relative = (files: string[]): string[] =>
  files.map((file) => path.relative(root, file)).sort();

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-langchain-files-'));
});

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true });
});

describe('getFilesByExtension', () => {
  it('returns absolute paths for matching files only', async () => {
    write('a.md');
    write('b.md');
    write('c.txt');

    const files = await getFilesByExtension('md', root);

    expect(files.every((file) => path.isAbsolute(file))).toBe(true);
    expect(relative(files)).toEqual(['a.md', 'b.md']);
  });

  it('recurses into nested directories', async () => {
    write('top.md');
    write('docs/nested/deep.md');

    const files = await getFilesByExtension('md', root);

    expect(relative(files)).toEqual([
      path.join('docs', 'nested', 'deep.md'),
      'top.md',
    ]);
  });

  it('always ignores node_modules and .git regardless of .gitignore', async () => {
    write('keep.md');
    write('node_modules/pkg/readme.md');
    write('nested/node_modules/dep/doc.md');
    write('.git/notes.md');

    const files = await getFilesByExtension('md', root);

    expect(relative(files)).toEqual(['keep.md']);
  });

  it('respects .gitignore patterns', async () => {
    write('.gitignore', 'ignored/\n*.tmp.md\n# comment\n\n');
    write('kept.md');
    write('ignored/secret.md');
    write('scratch.tmp.md');

    const files = await getFilesByExtension('md', root);

    expect(relative(files)).toEqual(['kept.md']);
  });

  it('returns an empty list when no files match the extension', async () => {
    write('a.txt');
    write('b.json');

    const files = await getFilesByExtension('md', root);

    expect(files).toEqual([]);
  });

  it('does not apply .gitignore comment lines as ignore patterns', async () => {
    // A leading-# line must be treated as a comment, not a pattern that would
    // accidentally match files.
    write('.gitignore', '# *.md\n');
    write('a.md');

    const files = await getFilesByExtension('md', root);

    expect(relative(files)).toEqual(['a.md']);
  });
});
