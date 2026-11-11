import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Tag } from './tag.entity.ts';
import { tagsFactory } from './tags.factory.ts';
import { TagsService } from './tags.service.ts';

describe('TagsService', () => {
  type GetRepository = ReturnType<TagsService['getRepository']>;

  let service: TagsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(tagsFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<TagsService>(TagsService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ name: expect.anything() });
    });
  });
});
