import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PlanEmbedding } from './plan-embedding.entity.ts';
import { planEmbeddingsFactory } from './plan-embeddings.factory.ts';
import { PlanEmbeddingsRepository } from './plan-embeddings.repository.ts';

describe('PlanEmbeddingsRepository', () => {
  const find = vi.fn();
  let repository: PlanEmbeddingsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanEmbeddingsRepository,
        {
          provide: getRepositoryToken(PlanEmbedding),
          useValue: createMock<Repository<PlanEmbedding>>({
            find,
            target: PlanEmbedding,
          }),
        },
      ],
    }).compile();

    repository = app.get<PlanEmbeddingsRepository>(PlanEmbeddingsRepository);
  });

  it('reads through the inherited findBy', async () => {
    find.mockResolvedValue(planEmbeddingsFactory.buildList(2));

    const embeddings = await repository.findBy();

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toMatchObject({
      content: expect.any(String),
      planId: expect.any(String),
    });
  });
});
