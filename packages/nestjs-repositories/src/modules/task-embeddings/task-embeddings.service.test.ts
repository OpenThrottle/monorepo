import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { TaskEmbedding } from './task-embedding.entity';
import { taskEmbeddingsFactory } from './task-embeddings.factory';
import { TaskEmbeddingsService } from './task-embeddings.service';

describe('TaskEmbeddingsService', () => {
  type GetRepository = ReturnType<TaskEmbeddingsService['getRepository']>;

  let service: TaskEmbeddingsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        TaskEmbeddingsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(TaskEmbedding),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(taskEmbeddingsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<TaskEmbeddingsService>(TaskEmbeddingsService);
  });

  describe('getRepository', () => {
    it('returns the task_embeddings repository', () => {
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
        taskId: expect.any(String),
      });
    });
  });
});
