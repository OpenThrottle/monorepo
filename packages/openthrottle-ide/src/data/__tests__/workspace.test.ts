import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashContent } from '../../utils/hash.ts';
import type { WorkspaceFileHash } from '../workspace.ts';
import { diffSnapshots, hashWorkspace, listFiles } from '../workspace.ts';

describe('workspace enumeration', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-ws-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\nignored.txt\n');
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await writeFile(join(root, 'ignored.txt'), 'should not appear');
    await writeFile(join(root, 'dist', 'out.js'), 'compiled');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('lists tracked files and honors .gitignore', async () => {
    const files = await listFiles({ root });

    expect(files.sort()).toEqual(['.gitignore', 'src/a.ts', 'src/b.ts']);
  });

  it('applies additional exclude globs', async () => {
    const files = await listFiles({ exclude: ['*.ts'], root });

    expect(files).toEqual(['.gitignore']);
  });

  it('hashes each enumerated file', async () => {
    const hashes = await hashWorkspace({ root });
    const byPath = new Map(hashes.map((entry) => [entry.path, entry.hash]));

    expect(byPath.get('src/a.ts')).toBe(hashContent('export const a = 1;\n'));
    expect(byPath.size).toBe(3);
  });
});

describe('symlink escape with followSymlinks', () => {
  let outside: string;
  let root: string;

  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'ot-ide-outside-'));
    root = await mkdtemp(join(tmpdir(), 'ot-ide-ws-'));
    await writeFile(join(outside, 'secret.txt'), 'top secret');
    await writeFile(join(root, 'inside.ts'), 'export const ok = 1;\n');
    // A symlink that stays inside the tree by name but whose target escapes.
    await symlink(join(outside, 'secret.txt'), join(root, 'leak.txt'));
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
    await rm(outside, { force: true, recursive: true });
  });

  it('drops symlinks whose real target escapes the root', async () => {
    const files = await listFiles({ followSymlinks: true, root });

    expect(files).toContain('inside.ts');
    expect(files).not.toContain('leak.txt');
  });

  it('does not hash an escaping symlink target', async () => {
    const hashes = await hashWorkspace({ followSymlinks: true, root });
    const paths = hashes.map((entry) => entry.path);

    expect(paths).toContain('inside.ts');
    expect(paths).not.toContain('leak.txt');
  });

  it('keeps symlinks whose target stays inside the root', async () => {
    await writeFile(join(root, 'real.ts'), 'export const real = 1;\n');
    await symlink(join(root, 'real.ts'), join(root, 'alias.ts'));

    const files = await listFiles({ followSymlinks: true, root });

    expect(files).toContain('alias.ts');
  });
});

describe('diffSnapshots', () => {
  const snapshot = (entries: Record<string, string>): WorkspaceFileHash[] =>
    Object.entries(entries).map(([path, content]) => ({
      hash: hashContent(content),
      path,
    }));

  it('reports added, changed, and removed paths', () => {
    const prev = snapshot({
      'src/a.ts': 'a1',
      'src/b.ts': 'b1',
      'src/gone.ts': 'g1',
    });
    const next = snapshot({
      'src/a.ts': 'a1',
      'src/b.ts': 'b2',
      'src/new.ts': 'n1',
    });

    expect(diffSnapshots(prev, next)).toEqual({
      added: ['src/new.ts'],
      changed: ['src/b.ts'],
      removed: ['src/gone.ts'],
    });
  });

  it('returns empty lists for identical snapshots', () => {
    const snap = snapshot({ 'src/a.ts': 'a1', 'src/b.ts': 'b1' });

    expect(diffSnapshots(snap, snap)).toEqual({
      added: [],
      changed: [],
      removed: [],
    });
  });

  it('sorts each list for deterministic output', () => {
    const prev = snapshot({});
    const next = snapshot({
      'src/a.ts': 'a',
      'src/m.ts': 'm',
      'src/z.ts': 'z',
    });

    expect(diffSnapshots(prev, next).added).toEqual([
      'src/a.ts',
      'src/m.ts',
      'src/z.ts',
    ]);
  });
});
