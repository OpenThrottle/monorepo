import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Schema } from './schema.entity.ts';
import { schemasFactory } from './schemas.factory.ts';
import { SchemasRepository } from './schemas.repository.ts';

describe('SchemasRepository', () => {
  const rows = schemasFactory.buildList(2);
  const typeorm = createMock<Repository<Schema>>({
    find: () => Promise.resolve(rows),
    target: Schema,
  });

  let repository: SchemasRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SchemasRepository,
        {
          provide: getRepositoryToken(Schema, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(SchemasRepository);
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
