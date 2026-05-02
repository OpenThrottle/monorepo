import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Plan } from './plan.entity';
import { plansFactory } from './plans.factory';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  type GetRepository = ReturnType<PlansService['getRepository']>;

  let service: PlansService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        PlansService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Plan),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(plansFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<PlansService>(PlansService);
  });

  describe('getRepository', () => {
    it('returns the plan repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const plans = await repo.find();

      expect(plans).toHaveLength(2);
      expect(plans[0]).toMatchObject({
        author: expect.any(String),
        status: expect.any(String),
        title: expect.any(String),
      });
    });
  });
});
