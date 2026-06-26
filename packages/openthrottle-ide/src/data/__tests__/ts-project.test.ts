import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ts } from 'ts-morph';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadProject, resetProjectCache } from '../ts-project.ts';

describe('loadProject', () => {
  let root: string;

  beforeEach(async () => {
    resetProjectCache();
    root = await mkdtemp(join(tmpdir(), 'ot-ide-tsproject-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: true, target: 'ES2022' },
        include: ['src'],
      }),
    );
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
  });

  afterEach(async () => {
    resetProjectCache();
    await rm(root, { force: true, recursive: true });
  });

  it('resolves compiler options from the workspace tsconfig.json', () => {
    const project = loadProject({ root });

    expect(project.getCompilerOptions().strict).toBe(true);
  });

  it('starts empty and sees source files added on demand', () => {
    const project = loadProject({ root });

    expect(project.getSourceFiles()).toHaveLength(0);

    const sourceFile = project.addSourceFileAtPath(join(root, 'src', 'a.ts'));

    expect(sourceFile.getExportedDeclarations().has('a')).toBe(true);
    expect(project.getSourceFiles()).toHaveLength(1);
  });

  it('caches the project per workspace root', () => {
    const first = loadProject({ root });
    const cached = loadProject({ root });
    const rebuilt = loadProject({ root }, { fresh: true });

    expect(cached).toBe(first);
    expect(rebuilt).not.toBe(first);
  });

  it('falls back to default compiler options without a tsconfig.json', async () => {
    const bare = await mkdtemp(join(tmpdir(), 'ot-ide-tsproject-bare-'));

    try {
      const project = loadProject({ root: bare });

      expect(project.getCompilerOptions().target).toBe(ts.ScriptTarget.Latest);
      expect(project.getCompilerOptions().allowJs).toBe(true);
    } finally {
      await rm(bare, { force: true, recursive: true });
    }
  });
});
