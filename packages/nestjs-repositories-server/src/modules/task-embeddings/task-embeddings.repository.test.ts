import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TaskEmbedding } from './task-embedding.entity.ts';
import { taskEmbeddingsFactory } from './task-embeddings.factory.ts';
import { TaskEmbeddingsRepository } from './task-embeddings.repository.ts';

describe('TaskEmbeddingsRepository', () => {
  const find = vi.fn();
  let repository: TaskEmbeddingsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TaskEmbeddingsRepository,
        {
          provide: getRepositoryToken(TaskEmbedding),
          useValue: createMock<Repository<TaskEmbedding>>({
            find,
            target: TaskEmbedding,
          }),
        },
      ],
    }).compile();

    repository = app.get<TaskEmbeddingsRepository>(TaskEmbeddingsRepository);
  });

  it('reads through the inherited findBy', async () => {
    find.mockResolvedValue(taskEmbeddingsFactory.buildList(2));

    const embeddings = await repository.findBy();

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toMatchObject({
      content: expect.any(String),
      taskId: expect.any(String),
    });
  });
});
