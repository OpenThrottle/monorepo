import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from './fragment.entity.ts';
import { fragmentsFactory } from './fragments.factory.ts';
import { FragmentsService } from './fragments.service.ts';

describe('FragmentsService', () => {
  type GetRepository = ReturnType<FragmentsService['getRepository']>;

  let service: FragmentsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        FragmentsService,
        {
          provide: getRepositoryToken(Fragment, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(fragmentsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<FragmentsService>(FragmentsService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ name: expect.anything() });
    });
  });
});
