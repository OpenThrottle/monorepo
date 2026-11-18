import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { planOutputStreamFactory } from './plan-output-stream.factory.ts';
import { PlanOutputStreamRepository } from './plan-output-stream.repository.ts';
import { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

describe('PlanOutputStreamRepository', () => {
  type GetRepository = Repository<PlanOutputStreamChunk>;

  let service: PlanOutputStreamRepository;
  let find: ReturnType<typeof vi.fn<GetRepository['find']>>;

  beforeAll(async () => {
    find = vi.fn((_options) =>
      Promise.resolve(planOutputStreamFactory.buildList(2)),
    );

    const app = await Test.createTestingModule({
      providers: [
        PlanOutputStreamRepository,
        {
          provide: getRepositoryToken(PlanOutputStreamChunk),
          useValue: createMock<GetRepository>({
            find,
            target: PlanOutputStreamChunk,
          }),
        },
      ],
    }).compile();

    service = app.get<PlanOutputStreamRepository>(PlanOutputStreamRepository);
  });

  describe('listChunks', () => {
    const planId = 'a1a2a3a4-0000-0000-0000-000000000001';

    it('queries by planId only when taskId is omitted', async () => {
      find.mockClear();

      await service.listChunks({ planId, skip: 0, take: 50 });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          where: { planId },
        }),
      );
    });

    it('queries by planId only when taskId is null', async () => {
      find.mockClear();

      await service.listChunks({ planId, skip: 0, take: 50, taskId: null });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { planId } }),
      );
    });

    it('adds a taskId clause when taskId is provided', async () => {
      const taskId = 'b1b2b3b4-0000-0000-0000-000000000002';
      find.mockClear();

      await service.listChunks({ planId, skip: 5, take: 25, taskId });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 25,
          where: { planId, taskId },
        }),
      );
    });

    it('orders results by createdAt ascending', async () => {
      find.mockClear();

      await service.listChunks({ planId, skip: 0, take: 50 });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
    });

    it('returns the chunks resolved by the repository', async () => {
      const chunks = await service.listChunks({ planId, skip: 0, take: 50 });

      expect(chunks).toHaveLength(2);
    });
  });
});
