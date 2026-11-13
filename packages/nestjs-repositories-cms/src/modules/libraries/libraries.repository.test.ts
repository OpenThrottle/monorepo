import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { librariesFactory } from './libraries.factory.ts';
import { LibrariesRepository } from './libraries.repository.ts';
import { Library } from './library.entity.ts';

describe('LibrariesRepository', () => {
  const rows = librariesFactory.buildList(2);
  const typeorm = createMock<Repository<Library>>({
    find: () => Promise.resolve(rows),
    target: Library,
  });

  let repository: LibrariesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LibrariesRepository,
        {
          provide: getRepositoryToken(Library, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(LibrariesRepository);
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
