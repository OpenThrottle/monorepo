/**
 * @description Security regression tests for createBranchInWorktree: explicit branch names,
 * base branches, and worktree paths beginning with `-` must NOT reach git's argv, where they
 * would be parsed as options (e.g. `--track`) rather than positional refs/paths (git-arg /
 * option injection). Explicit branch names bypass slugifyForBranch, so the guard lives in
 * createBranchInWorktree itself.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();

  return {
    ...actual,
    spawnSync: spawnSyncMock,
  };
});

describe('createBranchInWorktree — git option-injection hardening', () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
    spawnSyncMock.mockImplementation(() => ({
      status: 0,
      stderr: '',
      stdout: '',
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the branch and never adds a shell when args are safe', async () => {
    const { createBranchInWorktree } = await import('./parent-job');

    const result = createBranchInWorktree(
      '/tmp/worktree-1',
      'ralph/feature-a1b2c3',
      'main',
    );

    expect(result).toEqual({ ok: true });
    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnSyncMock.mock.calls[0] ?? [];
    expect(command).toBe('git');
    expect(args).toEqual([
      '-C',
      '/tmp/worktree-1',
      'checkout',
      '-b',
      'ralph/feature-a1b2c3',
      'main',
    ]);
    expect(options?.shell).toBeUndefined();
  });

  it('rejects an option-like explicit branch name before spawning git', async () => {
    const { createBranchInWorktree } = await import('./parent-job');

    const result = createBranchInWorktree('/tmp/worktree-1', '--track', 'main');

    expect(result.ok).toBe(false);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('rejects an option-like base branch before spawning git', async () => {
    const { createBranchInWorktree } = await import('./parent-job');

    const result = createBranchInWorktree(
      '/tmp/worktree-1',
      'ralph/feature',
      '-f',
    );

    expect(result.ok).toBe(false);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('rejects an option-like worktree path before spawning git', async () => {
    const { createBranchInWorktree } = await import('./parent-job');

    const result = createBranchInWorktree(
      '--upload-pack=touch /tmp/pwned',
      'ralph/feature',
      'main',
    );

    expect(result.ok).toBe(false);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('rejects empty branch / base / path args before spawning git', async () => {
    const { createBranchInWorktree } = await import('./parent-job');

    expect(createBranchInWorktree('/tmp/wt', '', 'main').ok).toBe(false);
    expect(createBranchInWorktree('/tmp/wt', 'ralph/feature', '').ok).toBe(
      false,
    );
    expect(createBranchInWorktree('', 'ralph/feature', 'main').ok).toBe(false);
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});
