import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';
import { tagsFactory } from './tags.factory.ts';
import { TagsRepository } from './tags.repository.ts';

describe('TagsRepository', () => {
  const rows = tagsFactory.buildList(2);
  const typeorm = createMock<Repository<Tag>>({
    find: () => Promise.resolve(rows),
    target: Tag,
  });

  let repository: TagsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TagsRepository,
        {
          provide: getRepositoryToken(Tag, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(TagsRepository);
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
