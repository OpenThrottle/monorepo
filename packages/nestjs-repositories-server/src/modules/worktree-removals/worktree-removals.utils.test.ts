import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createWorktreeRemovalsRepositoryMock } from './worktree-removals.utils.ts';

describe('createWorktreeRemovalsRepositoryMock', () => {
  it('starts as an empty worktree_removals table', async () => {
    const repository = createWorktreeRemovalsRepositoryMock();

    await expect(
      repository.findLatestByUserAndPaths('user-1', ['/a']),
    ).resolves.toEqual([]);
  });

  it('rejects record until a test stubs it', async () => {
    const repository = createWorktreeRemovalsRepositoryMock();

    await expect(
      repository.record({
        agentSession: null,
        ancestry: null,
        branch: null,
        checkoutId: null,
        filesystemPath: '/tmp/wt',
        outcome: 'pruned',
        parentCommand: null,
        pid: null,
        ppid: null,
        probe: null,
        removedAt: null,
        repositoryId: null,
        result: null,
        userId: 'user-1',
      }),
    ).rejects.toThrow('worktree_removals.record is not stubbed in this test');
  });

  it('names the worktree_removals table in inherited not-found errors', async () => {
    const repository = createWorktreeRemovalsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'worktree_removals record with ID "a" not found',
    );
  });
});
