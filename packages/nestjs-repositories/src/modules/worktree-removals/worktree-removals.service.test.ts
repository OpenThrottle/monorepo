import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorktreeRemoval } from './worktree-removal.entity.ts';
import { WorktreeRemovalsService } from './worktree-removals.service.ts';
import type { RecordWorktreeRemovalInput } from './worktree-removals.types.ts';

const input: RecordWorktreeRemovalInput = {
  agentSession: 'session-1',
  ancestry: '10 pnpm worktree:remove',
  branch: 'feat/x',
  checkoutId: null,
  filesystemPath: '/tmp/wt',
  outcome: 'pruned',
  parentCommand: 'sh destroy.sh',
  pid: 42,
  ppid: 41,
  probe: 'NOT_FOUND',
  removedAt: new Date('2026-11-15T00:00:00Z'),
  repositoryId: null,
  result: 'removed',
  userId: '11111111-1111-4111-8111-111111111111',
};

describe('WorktreeRemovalsService', () => {
  let service: WorktreeRemovalsService;
  const create = vi.fn();
  const save = vi.fn();
  const getMany = vi.fn();
  const qb: Record<string, ReturnType<typeof vi.fn>> = { getMany };
  for (const method of [
    'addOrderBy',
    'andWhere',
    'distinctOn',
    'orderBy',
    'where',
  ]) {
    qb[method] = vi.fn(() => qb);
  }
  const createQueryBuilder = vi.fn(() => qb);

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        WorktreeRemovalsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(WorktreeRemoval),
          useValue: { create, createQueryBuilder, save },
        },
      ],
    }).compile();
    service = app.get(WorktreeRemovalsService);
  });

  describe('record', () => {
    it('creates and saves one row from the input', async () => {
      const row = { ...input, createdAt: input.removedAt, id: 'row-1' };
      create.mockReturnValue(row);
      save.mockResolvedValue(row);

      await expect(service.record(input)).resolves.toBe(row);
      expect(create).toHaveBeenCalledWith(input);
      expect(save).toHaveBeenCalledWith(row);
    });
  });

  describe('findLatestByUserAndPaths', () => {
    describe('when no paths are given', () => {
      it('returns nothing without querying', async () => {
        await expect(
          service.findLatestByUserAndPaths(input.userId, []),
        ).resolves.toEqual([]);
        expect(createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('when paths are given', () => {
      it("takes the newest row per path, scoped to the user's paths", async () => {
        getMany.mockResolvedValue([]);

        await service.findLatestByUserAndPaths(input.userId, ['/a', '/b']);

        expect(qb.distinctOn).toHaveBeenCalledWith(['removal.filesystemPath']);
        expect(qb.where).toHaveBeenCalledWith('removal.userId = :userId', {
          userId: input.userId,
        });
        expect(qb.andWhere).toHaveBeenCalledWith(
          'removal.filesystemPath IN (:...paths)',
          { paths: ['/a', '/b'] },
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith('removal.createdAt', 'DESC');
      });
    });
  });
});
