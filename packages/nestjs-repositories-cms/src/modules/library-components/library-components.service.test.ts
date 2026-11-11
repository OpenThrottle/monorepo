import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { LibraryComponent } from './library-component.entity.ts';
import { libraryComponentsFactory } from './library-components.factory.ts';
import { LibraryComponentsService } from './library-components.service.ts';

describe('LibraryComponentsService', () => {
  type GetRepository = ReturnType<LibraryComponentsService['getRepository']>;

  let service: LibraryComponentsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LibraryComponentsService,
        {
          provide: getRepositoryToken(LibraryComponent, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(libraryComponentsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<LibraryComponentsService>(LibraryComponentsService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ typename: expect.anything() });
    });
  });
});
