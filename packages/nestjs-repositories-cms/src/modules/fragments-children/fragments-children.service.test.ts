import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { FragmentChild } from './fragment-child.entity.ts';
import { fragmentsChildrenFactory } from './fragments-children.factory.ts';
import { FragmentsChildrenService } from './fragments-children.service.ts';

describe('FragmentsChildrenService', () => {
  type GetRepository = ReturnType<FragmentsChildrenService['getRepository']>;

  let service: FragmentsChildrenService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        FragmentsChildrenService,
        {
          provide: getRepositoryToken(FragmentChild, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(fragmentsChildrenFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<FragmentsChildrenService>(FragmentsChildrenService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ fragmentUuid: expect.anything() });
    });
  });
});
