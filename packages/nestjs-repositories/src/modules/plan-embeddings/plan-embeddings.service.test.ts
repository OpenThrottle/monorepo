import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { PlanEmbedding } from './plan-embedding.entity';
import { planEmbeddingsFactory } from './plan-embeddings.factory';
import { PlanEmbeddingsService } from './plan-embeddings.service';

describe('PlanEmbeddingsService', () => {
  type GetRepository = ReturnType<PlanEmbeddingsService['getRepository']>;

  let service: PlanEmbeddingsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        PlanEmbeddingsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(PlanEmbedding),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(planEmbeddingsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<PlanEmbeddingsService>(PlanEmbeddingsService);
  });

  describe('getRepository', () => {
    it('returns the plan_embeddings repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const embeddings = await repo.find();

      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toMatchObject({
        content: expect.any(String),
        planId: expect.any(String),
      });
    });
  });
});
