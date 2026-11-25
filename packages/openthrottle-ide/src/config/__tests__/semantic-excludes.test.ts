import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { chunkWorkspace } from '../../data/chunk.ts';
import {
  DEFAULT_SEMANTIC_EXCLUDE_GLOBS,
  semanticExcludeGlobs,
} from '../semantic-excludes.ts';

describe('semanticExcludeGlobs', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-excludes-'));
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  describe('when the workspace has no .gitattributes', () => {
    it('returns the defaults', async () => {
      expect(await semanticExcludeGlobs(root)).toEqual([
        ...DEFAULT_SEMANTIC_EXCLUDE_GLOBS,
      ]);
    });
  });

  describe('when .gitattributes marks paths generated or vendored', () => {
    it('adds those patterns and ignores comments and other attributes', async () => {
      await writeFile(
        join(root, '.gitattributes'),
        [
          '# generated output',
          'plugins/*/hooks/*.cjs linguist-generated=true',
          '.agents/skills/** linguist-vendored=true',
          'schema.gql -linguist-generated',
          '*.sh text eol=lf',
          '',
        ].join('\n'),
      );

      const globs = await semanticExcludeGlobs(root);

      expect(globs).toContain('plugins/*/hooks/*.cjs');
      expect(globs).toContain('.agents/skills/**');
      expect(globs).not.toContain('schema.gql');
      expect(globs).not.toContain('*.sh');
    });
  });

  it('keeps lockfiles, licenses, binaries and docs/ out of chunkWorkspace', async () => {
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    await writeFile(join(root, 'README.md'), '# Repo\n');
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    await writeFile(join(root, 'LICENSE'), 'Apache-2.0\n');
    await writeFile(join(root, 'docs', 'guide.md'), '# Guide\n');
    await writeFile(join(root, 'src', 'logo.svg'), '<svg></svg>\n');

    const exclude = await semanticExcludeGlobs(root);
    const chunks = await chunkWorkspace({ exclude, root });

    const paths = new Set(chunks.map((chunk) => chunk.path));
    expect(paths).toEqual(new Set(['README.md', 'src/a.ts']));
  });
});
