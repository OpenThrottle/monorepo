import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';
import { libraryComponentsFactory } from './library-components.factory.ts';
import { LibraryComponentsRepository } from './library-components.repository.ts';

describe('LibraryComponentsRepository', () => {
  const rows = libraryComponentsFactory.buildList(2);
  const typeorm = createMock<Repository<LibraryComponent>>({
    find: () => Promise.resolve(rows),
    target: LibraryComponent,
  });

  let repository: LibraryComponentsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LibraryComponentsRepository,
        {
          provide: getRepositoryToken(LibraryComponent, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(LibraryComponentsRepository);
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
