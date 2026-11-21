import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogPost } from '../blog-posts/blog-post.entity.ts';
import { applyBlogPostVisibility } from '../blog-posts/visibility/visibility.utils.ts';
import { BlogTag } from './blog-tag.entity.ts';
import { blogTagsFactory } from './blog-tags.factory.ts';
import { BlogTagsRepository } from './blog-tags.repository.ts';
import type { BlogTagData } from './blog-tags.types.ts';

describe('BlogTagsRepository', () => {
  type GetRepository = Repository<BlogTag>;

  const tags = blogTagsFactory.buildList(2);
  const queryBuilder = createQueryBuilderMock<BlogTagData>();

  const find = vi.fn();
  const upsert = vi.fn();
  const findOneByOrFail = vi.fn();
  let service: BlogTagsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryBuilder.getMany.mockResolvedValue(tags);

    const app = await Test.createTestingModule({
      providers: [
        BlogTagsRepository,
        {
          provide: getRepositoryToken(BlogTag),
          useValue: createMock<GetRepository>({
            createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
            find,
            findOneByOrFail,
            target: BlogTag,
            upsert,
          }),
        },
      ],
    }).compile();

    service = app.get<BlogTagsRepository>(BlogTagsRepository);
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
      // the rule is not restated in the tags repository.
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
    it('upserts on the live-slug conflict path and returns the stored row', async () => {
      const stored = blogTagsFactory.build({ slug: 'ops' });
      findOneByOrFail.mockResolvedValue(stored);

      const result = await service.upsertTag({
        description: 'Operations',
        name: 'Ops',
        slug: 'ops',
      });

      expect(upsert).toHaveBeenCalledWith(
        { description: 'Operations', name: 'Ops', slug: 'ops' },
        { conflictPaths: ['slug'], indexPredicate: 'deleted_at IS NULL' },
      );
      expect(findOneByOrFail).toHaveBeenCalledWith({ slug: 'ops' });
      expect(result).toBe(stored);
    });

    it('conflicts on the partial unique index, so a soft-deleted slug is not a conflict', async () => {
      findOneByOrFail.mockResolvedValue(blogTagsFactory.build());

      await service.upsertTag({ name: 'Ops', slug: 'ops' });

      expect(upsert.mock.calls[0]?.[1]).toEqual({
        conflictPaths: ['slug'],
        indexPredicate: 'deleted_at IS NULL',
      });
    });

    it('clears the description when omitted (full replace)', async () => {
      findOneByOrFail.mockResolvedValue(blogTagsFactory.build());

      await service.upsertTag({ name: 'Ops', slug: 'ops' });

      expect(upsert).toHaveBeenCalledWith(
        { description: null, name: 'Ops', slug: 'ops' },
        { conflictPaths: ['slug'], indexPredicate: 'deleted_at IS NULL' },
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
