import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Layout } from './layout.entity.ts';
import { layoutsFactory } from './layouts.factory.ts';
import { LayoutsRepository } from './layouts.repository.ts';

describe('LayoutsRepository', () => {
  const rows = layoutsFactory.buildList(2);
  const typeorm = createMock<Repository<Layout>>({
    find: () => Promise.resolve(rows),
    target: Layout,
  });

  let repository: LayoutsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LayoutsRepository,
        {
          provide: getRepositoryToken(Layout, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(LayoutsRepository);
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
