import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';
import { schemasFactory } from './schemas.factory.ts';
import { SchemasService } from './schemas.service.ts';

describe('SchemasService', () => {
  type GetRepository = ReturnType<SchemasService['getRepository']>;

  let service: SchemasService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SchemasService,
        {
          provide: getRepositoryToken(Schema, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(schemasFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<SchemasService>(SchemasService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ typename: expect.anything() });
    });
  });
});
