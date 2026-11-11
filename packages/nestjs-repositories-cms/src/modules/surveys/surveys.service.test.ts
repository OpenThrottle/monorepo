import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Survey } from './survey.entity.ts';
import { surveysFactory } from './surveys.factory.ts';
import { SurveysService } from './surveys.service.ts';

describe('SurveysService', () => {
  type GetRepository = ReturnType<SurveysService['getRepository']>;

  let service: SurveysService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SurveysService,
        {
          provide: getRepositoryToken(Survey, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(surveysFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<SurveysService>(SurveysService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ name: expect.anything() });
    });
  });
});
