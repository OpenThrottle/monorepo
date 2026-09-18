import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PlanOutputStreamChunk } from './plan-output-stream.entity.ts';
import { planOutputStreamFactory } from './plan-output-stream.factory.ts';
import { PlanOutputStreamService } from './plan-output-stream.service.ts';

describe('PlanOutputStreamService', () => {
  type GetRepository = ReturnType<PlanOutputStreamService['getRepository']>;

  let service: PlanOutputStreamService;
  let find: ReturnType<typeof vi.fn<GetRepository['find']>>;

  beforeAll(async () => {
    find = vi.fn((_options) =>
      Promise.resolve(planOutputStreamFactory.buildList(2)),
    );

    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        PlanOutputStreamService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(PlanOutputStreamChunk),
          useValue: createMock<GetRepository>({ find }),
        },
      ],
    }).compile();

    service = app.get<PlanOutputStreamService>(PlanOutputStreamService);
  });

  describe('getRepository', () => {
    it('returns the plan_output_stream repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const chunks = await repo.find();

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toMatchObject({
        content: expect.any(String),
        planId: expect.any(String),
      });
    });
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
