import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from './fragment.entity.ts';
import { fragmentsFactory } from './fragments.factory.ts';
import { FragmentsRepository } from './fragments.repository.ts';

describe('FragmentsRepository', () => {
  const rows = fragmentsFactory.buildList(2);
  const typeorm = createMock<Repository<Fragment>>({
    find: () => Promise.resolve(rows),
    target: Fragment,
  });

  let repository: FragmentsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        FragmentsRepository,
        {
          provide: getRepositoryToken(Fragment, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(FragmentsRepository);
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
