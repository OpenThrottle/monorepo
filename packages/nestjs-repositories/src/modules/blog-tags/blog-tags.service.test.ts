import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { SelectQueryBuilder } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogPost } from '../blog-posts/blog-post.entity.ts';
import { applyBlogPostVisibility } from '../blog-posts/blog-post-visibility.ts';
import { BlogTag } from './blog-tag.entity.ts';
import { blogTagsFactory } from './blog-tags.factory.ts';
import { BlogTagsService } from './blog-tags.service.ts';

describe('BlogTagsService', () => {
  type GetRepository = ReturnType<BlogTagsService['getRepository']>;

  const tags = blogTagsFactory.buildList(2);
  const queryBuilder = {
    addOrderBy: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  const find = vi.fn();
  const upsert = vi.fn();
  const findOneByOrFail = vi.fn();
  let service: BlogTagsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryBuilder.getMany.mockResolvedValue(tags);

    const app = await Test.createTestingModule({
      providers: [
        BlogTagsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(BlogTag),
          useValue: createMock<GetRepository>({
            createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
            find,
            findOneByOrFail,
            upsert,
          }),
        },
      ],
    }).compile();

    service = app.get<BlogTagsService>(BlogTagsService);
  });

  describe('getRepository', () => {
    it('returns the blog tag repository', () => {
      expect(service.getRepository().createQueryBuilder).toBeDefined();
    });
  });

  describe('findAllTags', () => {
    it('returns every tag (admin read, no visibility rule) ordered by name, then id', async () => {
      find.mockResolvedValue(tags);

      expect(await service.findAllTags()).toBe(tags);
      expect(find).toHaveBeenCalledWith({ order: { id: 'ASC', name: 'ASC' } });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findVisibleTags', () => {
    it('joins posts and applies the shared visibility predicate on that alias', async () => {
      const result = await service.findVisibleTags();

      expect(result).toEqual(tags);
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith('tag.posts', 'post');

      // The clauses must be exactly what the single visibility function emits —
      // the rule is not restated in the tags service.
      const expected = vi.fn();
      applyBlogPostVisibility(
        createMock<SelectQueryBuilder<BlogPost>>({
          andWhere: expected.mockReturnThis(),
        }),
        'post',
      );
      expect(queryBuilder.andWhere.mock.calls).toEqual(expected.mock.calls);
    });

    it('returns each tag once, ordered by name', async () => {
      await service.findVisibleTags();

      expect(queryBuilder.distinct).toHaveBeenCalledWith(true);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('tag.name', 'ASC');
    });
  });

  describe('upsertTag', () => {
    it('upserts on the slug conflict path and returns the stored row', async () => {
      const stored = blogTagsFactory.build({ slug: 'ops' });
      findOneByOrFail.mockResolvedValue(stored);

      const result = await service.upsertTag({
        description: 'Operations',
        name: 'Ops',
        slug: 'ops',
      });

      expect(upsert).toHaveBeenCalledWith(
        { description: 'Operations', name: 'Ops', slug: 'ops' },
        { conflictPaths: ['slug'] },
      );
      expect(findOneByOrFail).toHaveBeenCalledWith({ slug: 'ops' });
      expect(result).toBe(stored);
    });

    it('clears the description when omitted (full replace)', async () => {
      findOneByOrFail.mockResolvedValue(blogTagsFactory.build());

      await service.upsertTag({ name: 'Ops', slug: 'ops' });

      expect(upsert).toHaveBeenCalledWith(
        { description: null, name: 'Ops', slug: 'ops' },
        { conflictPaths: ['slug'] },
      );
    });

    it.each(['Bad Slug', '-x', ''])(
      'rejects malformed slug %j before touching the database',
      async (slug) => {
        await expect(service.upsertTag({ name: 'Ops', slug })).rejects.toThrow(
          BadRequestException,
        );
        expect(upsert).not.toHaveBeenCalled();
      },
    );

    it('rejects a blank name', async () => {
      await expect(
        service.upsertTag({ name: ' ', slug: 'ops' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
