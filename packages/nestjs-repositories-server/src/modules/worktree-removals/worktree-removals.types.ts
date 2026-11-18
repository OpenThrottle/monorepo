import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { WorktreeRemoval } from './worktree-removal.entity.ts';
import type { WorktreeRemovalsRepository } from './worktree-removals.repository.ts';

/**
 * The already-normalized removal record the repository persists. The caller owns validation and
 * truncation; the repository stores what it is given.
 * @public
 */
export interface RecordWorktreeRemovalInput {
  readonly agentSession: string | null;
  readonly ancestry: string | null;
  readonly branch: string | null;
  readonly checkoutId: string | null;
  readonly filesystemPath: string;
  readonly outcome: string;
  readonly parentCommand: string | null;
  readonly pid: number | null;
  readonly ppid: number | null;
  readonly probe: string | null;
  readonly removedAt: Date | null;
  readonly repositoryId: string | null;
  readonly result: string | null;
  readonly userId: string;
}

/**
 * @description A {@link WorktreeRemovalsRepository} mock: every inherited `BaseRepository`
 * method plus the worktree-removals ones.
 * @public
 */
export interface WorktreeRemovalsRepositoryMock extends BaseRepositoryMock<
  WorktreeRemoval,
  CreateModelInput<WorktreeRemoval>
> {
  readonly findLatestByUserAndPaths: Mock<
    WorktreeRemovalsRepository['findLatestByUserAndPaths']
  >;
  readonly record: Mock<WorktreeRemovalsRepository['record']>;
}
