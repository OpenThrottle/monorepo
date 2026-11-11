import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';
import { layoutsFactory } from './layouts.factory.ts';
import { LayoutsService } from './layouts.service.ts';

describe('LayoutsService', () => {
  type GetRepository = ReturnType<LayoutsService['getRepository']>;

  let service: LayoutsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LayoutsService,
        {
          provide: getRepositoryToken(Layout, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(layoutsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<LayoutsService>(LayoutsService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ slug: expect.anything() });
    });
  });
});
