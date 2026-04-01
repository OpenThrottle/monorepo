import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { PlanOutputStreamChunk } from './plan-output-stream.entity';
import { planOutputStreamFactory } from './plan-output-stream.factory';
import { PlanOutputStreamService } from './plan-output-stream.service';

describe('PlanOutputStreamService', () => {
  type GetRepository = ReturnType<PlanOutputStreamService['getRepository']>;

  let service: PlanOutputStreamService;

  beforeAll(async () => {
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
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(planOutputStreamFactory.buildList(2)),
          }),
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
});
