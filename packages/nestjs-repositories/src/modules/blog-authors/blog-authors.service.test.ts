import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlogAuthor } from './blog-author.entity.ts';
import { blogAuthorsFactory } from './blog-authors.factory.ts';
import { BlogAuthorsService } from './blog-authors.service.ts';

describe('BlogAuthorsService', () => {
  type GetRepository = ReturnType<BlogAuthorsService['getRepository']>;

  const upsert = vi.fn();
  const findOneByOrFail = vi.fn();
  let service: BlogAuthorsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        BlogAuthorsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(BlogAuthor),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(blogAuthorsFactory.buildList(2)),
            findOneByOrFail,
            upsert,
          }),
        },
      ],
    }).compile();

    service = app.get<BlogAuthorsService>(BlogAuthorsService);
  });

  describe('getRepository', () => {
    it('returns the blog author repository', () => {
      expect(service.getRepository().find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const authors = await service.getRepository().find();

      expect(authors).toHaveLength(2);
      expect(authors[0]).toMatchObject({ displayName: expect.any(String) });
    });
  });

  describe('upsertAuthor', () => {
    it('upserts on the slug conflict path and returns the stored row', async () => {
      const stored = blogAuthorsFactory.build({ slug: 'ada' });
      findOneByOrFail.mockResolvedValue(stored);

      const result = await service.upsertAuthor({
        avatarUrl: 'https://example.com/a.png',
        bio: 'Hi',
        displayName: 'Ada',
        slug: 'ada',
      });

      expect(upsert).toHaveBeenCalledWith(
        {
          avatarUrl: 'https://example.com/a.png',
          bio: 'Hi',
          displayName: 'Ada',
          slug: 'ada',
        },
        { conflictPaths: ['slug'] },
      );
      expect(findOneByOrFail).toHaveBeenCalledWith({ slug: 'ada' });
      expect(result).toBe(stored);
    });

    it('clears bio and avatar when omitted (full replace)', async () => {
      findOneByOrFail.mockResolvedValue(blogAuthorsFactory.build());

      await service.upsertAuthor({ displayName: 'Ada', slug: 'ada' });

      expect(upsert).toHaveBeenCalledWith(
        { avatarUrl: null, bio: null, displayName: 'Ada', slug: 'ada' },
        { conflictPaths: ['slug'] },
      );
    });

    it('never writes user_id', async () => {
      findOneByOrFail.mockResolvedValue(blogAuthorsFactory.build());

      await service.upsertAuthor({ displayName: 'Ada', slug: 'ada' });

      expect(upsert.mock.calls[0]?.[0]).not.toHaveProperty('userId');
    });

    it.each(['Bad Slug', 'x--y', ''])(
      'rejects malformed slug %j before touching the database',
      async (slug) => {
        await expect(
          service.upsertAuthor({ displayName: 'Ada', slug }),
        ).rejects.toThrow(BadRequestException);
        expect(upsert).not.toHaveBeenCalled();
      },
    );

    it('rejects a blank display name', async () => {
      await expect(
        service.upsertAuthor({ displayName: '  ', slug: 'ada' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
