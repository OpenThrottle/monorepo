import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { searchText } from '../search.js';

describe('searchText', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-search-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'a.ts'),
      ['export function createUser() {}', 'const TODO = 1;'].join('\n'),
    );
    await writeFile(
      join(root, 'src', 'b.md'),
      'createUser is documented here\n',
    );
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('finds literal matches with location metadata', async () => {
    const matches = await searchText('createUser', { root });
    const paths = matches.map((match) => match.path).sort();

    expect(paths).toEqual(['src/a.ts', 'src/b.md']);
    const tsMatch = matches.find((match) => match.path === 'src/a.ts');
    expect(tsMatch?.line).toBe(1);
    expect(tsMatch?.matchText).toBe('createUser');
    expect(tsMatch?.lineText).toBe('export function createUser() {}');
  });

  it('restricts results by glob', async () => {
    const matches = await searchText(
      'createUser',
      { root },
      { globs: ['*.ts'] },
    );

    expect(matches.map((match) => match.path)).toEqual(['src/a.ts']);
  });

  it('treats the query as a regular expression when regex is set', async () => {
    const matches = await searchText(
      'create\\w+',
      { root },
      { globs: ['*.ts'], regex: true },
    );

    expect(matches[0]?.matchText).toBe('createUser');
  });

  it('treats the query literally by default', async () => {
    const matches = await searchText('create\\w+', { root });

    expect(matches).toEqual([]);
  });

  it('caps results at maxResults', async () => {
    const matches = await searchText('createUser', { root }, { maxResults: 1 });

    expect(matches).toHaveLength(1);
  });
});
