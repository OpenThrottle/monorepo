import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { plansFactory } from '../plans/plans.factory';
import { CommitLink } from './commit-link.entity';
import { commitLinksFactory } from './commit-links.factory';
import { CommitLinksService } from './commit-links.service';

describe('CommitLinksService', () => {
  type GetRepository = ReturnType<CommitLinksService['getRepository']>;

  let service: CommitLinksService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        CommitLinksService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(CommitLink),
          useValue: createMock<GetRepository>({
            find: () =>
              Promise.resolve([
                {
                  ...commitLinksFactory.build(),
                  plan: plansFactory.build(),
                  task: null,
                },
                {
                  ...commitLinksFactory.build(),
                  plan: plansFactory.build(),
                  task: null,
                },
              ]),
          }),
        },
      ],
    }).compile();

    service = app.get<CommitLinksService>(CommitLinksService);
  });

  describe('getRepository', () => {
    it('returns the commit_links repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const links = await repo.find();

      expect(links).toHaveLength(2);
      expect(links[0]).toMatchObject({
        planId: expect.any(String),
        repo: expect.any(String),
        sha: expect.any(String),
      });
    });
  });
});
