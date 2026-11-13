import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';
import { surveysFactory } from './surveys.factory.ts';
import { SurveysRepository } from './surveys.repository.ts';

describe('SurveysRepository', () => {
  const rows = surveysFactory.buildList(2);
  const typeorm = createMock<Repository<Survey>>({
    find: () => Promise.resolve(rows),
    target: Survey,
  });

  let repository: SurveysRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SurveysRepository,
        {
          provide: getRepositoryToken(Survey, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(SurveysRepository);
  });

  describe('findBy', () => {
    it('reads live rows from the repository registered on the cms connection', async () => {
      await expect(repository.findBy()).resolves.toBe(rows);
      expect(typeorm.find).toHaveBeenCalledWith({
        where: { isDeleted: expect.anything() },
      });
    });
  });
});
