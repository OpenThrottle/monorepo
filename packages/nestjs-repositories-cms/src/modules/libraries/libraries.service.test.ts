import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { librariesFactory } from './libraries.factory.ts';
import { LibrariesService } from './libraries.service.ts';
import { Library } from './library.entity.ts';

describe('LibrariesService', () => {
  type GetRepository = ReturnType<LibrariesService['getRepository']>;

  let service: LibrariesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        LibrariesService,
        {
          provide: getRepositoryToken(Library, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(librariesFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<LibrariesService>(LibrariesService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ name: expect.anything() });
    });
  });
});
