import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { EvalCase } from '../../types/index.ts';
import { createGitWorktreeWorkspaceFactory } from '../factories.ts';

const caseWith = (files: EvalCase['input']['cwdSetup']['files']): EvalCase => {
  return {
    gold: null,
    id: 'case-1',
    input: { cwdSetup: { files }, prompt: 'go' },
    split: 'dev',
  };
};

const git = (cwd: string, ...args: string[]): string => {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
};

describe('createGitWorktreeWorkspaceFactory', () => {
  let repo = '';

  beforeAll(async () => {
    repo = await mkdtemp(join(tmpdir(), 'ot-eval-repo-'));
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'config', 'user.email', 'eval@example.test');
    git(repo, 'config', 'user.name', 'Eval');
    await writeFile(join(repo, 'README.md'), 'hello');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');
  });

  afterAll(async () => {
    await rm(repo, { force: true, recursive: true });
  });

  it('checks out the ref detached, writes setup files and removes it on dispose', async () => {
    const factory = createGitWorktreeWorkspaceFactory({
      ref: 'main',
      repoPath: repo,
    });
    const workspace = await factory.create(
      caseWith([{ content: 'seed', path: 'nested/seed.txt' }]),
      1,
    );

    expect(readFileSync(join(workspace.cwd, 'README.md'), 'utf8')).toBe(
      'hello',
    );
    expect(readFileSync(join(workspace.cwd, 'nested/seed.txt'), 'utf8')).toBe(
      'seed',
    );
    expect(git(workspace.cwd, 'rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe(
      'HEAD',
    );
    expect(git(repo, 'worktree', 'list')).toContain(workspace.cwd);

    await workspace.dispose();

    expect(existsSync(workspace.cwd)).toBe(false);
    expect(git(repo, 'worktree', 'list')).not.toContain(workspace.cwd);
  });

  it('gives each attempt its own directory', async () => {
    const factory = createGitWorktreeWorkspaceFactory({
      ref: 'main',
      repoPath: repo,
    });
    const first = await factory.create(caseWith([]), 1);
    const second = await factory.create(caseWith([]), 2);

    expect(first.cwd).not.toBe(second.cwd);

    await Promise.all([first.dispose(), second.dispose()]);
  });

  it('rejects a setup file that escapes the workspace and cleans up', async () => {
    const factory = createGitWorktreeWorkspaceFactory({
      ref: 'main',
      repoPath: repo,
    });

    await expect(
      factory.create(caseWith([{ content: 'x', path: '../escape.txt' }]), 1),
    ).rejects.toThrow(/escapes the workspace/);
    expect(git(repo, 'worktree', 'list').trim().split('\n')).toHaveLength(1);
  });

  it('rejects an unknown ref', async () => {
    const factory = createGitWorktreeWorkspaceFactory({
      ref: 'no-such-ref',
      repoPath: repo,
    });

    await expect(factory.create(caseWith([]), 1)).rejects.toThrow();
  });
});
