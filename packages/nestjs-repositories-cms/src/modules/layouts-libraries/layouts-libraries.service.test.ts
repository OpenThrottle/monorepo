import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LayoutLibrary } from './layout-library.entity.ts';
import { layoutsLibrariesFactory } from './layouts-libraries.factory.ts';
import { LayoutsLibrariesService } from './layouts-libraries.service.ts';

describe('LayoutsLibrariesService', () => {
  type GetRepository = ReturnType<LayoutsLibrariesService['getRepository']>;

  let service: LayoutsLibrariesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LayoutsLibrariesService,
        {
          provide: getRepositoryToken(LayoutLibrary, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(layoutsLibrariesFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<LayoutsLibrariesService>(LayoutsLibrariesService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ layoutUuid: expect.anything() });
    });
  });
});
