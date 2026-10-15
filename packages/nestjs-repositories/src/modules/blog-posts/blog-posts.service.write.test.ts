import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { blogAuthorsFactory } from '../blog-authors/blog-authors.factory.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { blogTagsFactory } from '../blog-tags/blog-tags.factory.ts';
import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import { BlogPost } from './blog-post.entity.ts';
import { blogPostsFactory } from './blog-posts.factory.ts';
import { BlogPostsService } from './blog-posts.service.ts';
import {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
} from './blog-write-result.ts';

const NOW = new Date('2026-10-11T12:00:00.000Z');
const FUTURE = new Date('2026-12-25T09:00:00.000Z');
const PAST = new Date('2026-09-01T00:00:00.000Z');

const uniqueViolation = (): QueryFailedError =>
  new QueryFailedError(
    'INSERT INTO blog_posts',
    [],
    Object.assign(new Error('duplicate key value'), { code: '23505' }),
  );

const buildPost = (overrides: Partial<BlogPost> = {}): BlogPost =>
  Object.assign(
    new BlogPost(),
    blogPostsFactory.build({
      publishedAt: null,
      slug: 'existing-post',
      status: BLOG_POST_STATUS.DRAFT,
    }),
    { author: null, tags: [] },
    overrides,
  );

describe('BlogPostsService write path', () => {
  const postRepository = createMock<Repository<BlogPost>>();
  const authorRepository = createMock<Repository<BlogAuthor>>();
  const tagRepository = createMock<Repository<BlogTag>>();
  let service: BlogPostsService;

  /** `findOne` (the reload after a save) returns whatever `post` currently holds. */
  const reloadReturns = (post: BlogPost): void => {
    postRepository.findOne.mockResolvedValue(post);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    postRepository.create.mockImplementation((input) =>
      Object.assign(new BlogPost(), input, { id: 'new-post-id' }),
    );
    postRepository.save.mockImplementation((entity) =>
      Promise.resolve(Object.assign(new BlogPost(), entity)),
    );

    const app = await Test.createTestingModule({
      providers: [
        BlogPostsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(BlogPost), useValue: postRepository },
        { provide: getRepositoryToken(BlogAuthor), useValue: authorRepository },
        { provide: getRepositoryToken(BlogTag), useValue: tagRepository },
      ],
    }).compile();

    service = app.get<BlogPostsService>(BlogPostsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createPost', () => {
    const draft = {
      bodyMarkdown: '# Hello',
      slug: 'hello-world',
      title: 'Hello world',
    };

    it('creates a DRAFT with no author and returns it reloaded', async () => {
      const created = buildPost({ id: 'new-post-id', slug: 'hello-world' });
      reloadReturns(created);

      const result = await service.createPost(draft);

      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: null,
          slug: 'hello-world',
          status: BLOG_POST_STATUS.DRAFT,
        }),
      );
      expect(result).toEqual({
        kind: BLOG_WRITE_RESULT_KIND.OK,
        value: created,
      });
    });

    it('never sets published_at on creation', async () => {
      reloadReturns(buildPost());

      await service.createPost(draft);

      const input = postRepository.create.mock.calls[0]?.[0];
      expect(input).not.toHaveProperty('publishedAt');
    });

    it('resolves the author slug to the author id', async () => {
      const author = blogAuthorsFactory.build({ slug: 'ada' });
      authorRepository.findOneBy.mockResolvedValue(
        Object.assign(new BlogAuthor(), author),
      );
      reloadReturns(buildPost());

      await service.createPost({ ...draft, authorSlug: 'ada' });

      expect(authorRepository.findOneBy).toHaveBeenCalledWith({ slug: 'ada' });
      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: author.id }),
      );
    });

    it('returns not-found for an unknown author slug without saving', async () => {
      authorRepository.findOneBy.mockResolvedValue(null);

      const result = await service.createPost({
        ...draft,
        authorSlug: 'nobody',
      });

      expect(result).toEqual({
        entity: BLOG_WRITE_ENTITY.AUTHOR,
        key: 'nobody',
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('returns a slug-conflict result (not a thrown 23505) when the slug is taken', async () => {
      postRepository.save.mockRejectedValue(uniqueViolation());

      const result = await service.createPost(draft);

      expect(result).toEqual({
        kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
        slug: 'hello-world',
      });
    });

    it('rethrows errors that are not unique violations', async () => {
      postRepository.save.mockRejectedValue(new Error('connection reset'));

      await expect(service.createPost(draft)).rejects.toThrow(
        'connection reset',
      );
    });

    it.each(['Bad Slug', 'UPPER', '-x', 'x-', 'a--b', ''])(
      'rejects the malformed slug %j before touching the database',
      async (slug) => {
        await expect(service.createPost({ ...draft, slug })).rejects.toThrow(
          BadRequestException,
        );
        expect(postRepository.save).not.toHaveBeenCalled();
      },
    );

    it('rejects a blank title', async () => {
      await expect(
        service.createPost({ ...draft, title: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePost', () => {
    it('returns not-found for an unknown post id', async () => {
      postRepository.findOneBy.mockResolvedValue(null);

      const result = await service.updatePost('missing', { title: 'x' });

      expect(result).toEqual({
        entity: BLOG_WRITE_ENTITY.POST,
        key: 'missing',
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('applies only provided fields; null clears, undefined leaves unchanged', async () => {
      const post = buildPost({
        excerpt: 'old excerpt',
        seoTitle: 'old seo',
        title: 'Old title',
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.updatePost(post.id, {
        excerpt: null,
        seoTitle: undefined,
        title: 'New title',
      });

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          excerpt: null,
          seoTitle: 'old seo',
          title: 'New title',
        }),
      );
    });

    it('does not let a patch change status or published_at', async () => {
      const post = buildPost({
        publishedAt: PAST,
        status: BLOG_POST_STATUS.PUBLISHED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.updatePost(post.id, { title: 'Retitled' });

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.PUBLISHED,
        }),
      );
    });

    it('returns a slug-conflict result when re-slugging onto another post', async () => {
      const post = buildPost();
      postRepository.findOneBy.mockResolvedValue(post);
      postRepository.save.mockRejectedValue(uniqueViolation());

      const result = await service.updatePost(post.id, { slug: 'taken-slug' });

      expect(result).toEqual({
        kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
        slug: 'taken-slug',
      });
    });

    it('clears the author when authorSlug is null', async () => {
      const post = buildPost({ authorId: 'some-author' });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.updatePost(post.id, { authorSlug: null });

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: null }),
      );
    });

    it('returns not-found for an unknown author slug', async () => {
      postRepository.findOneBy.mockResolvedValue(buildPost());
      authorRepository.findOneBy.mockResolvedValue(null);

      const result = await service.updatePost('id', { authorSlug: 'ghost' });

      expect(result).toMatchObject({
        entity: BLOG_WRITE_ENTITY.AUTHOR,
        key: 'ghost',
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
    });

    it('rejects a malformed slug and a blank title up front', async () => {
      await expect(
        service.updatePost('id', { slug: 'Not Valid' }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.updatePost('id', { title: '' })).rejects.toThrow(
        BadRequestException,
      );
      expect(postRepository.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('publishPost', () => {
    it('stamps now() when no publishedAt is given', async () => {
      const post = buildPost();
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: NOW,
          status: BLOG_POST_STATUS.PUBLISHED,
        }),
      );
    });

    it('stamps now() when publishedAt is explicitly null', async () => {
      const post = buildPost();
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id, null);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: NOW }),
      );
    });

    it('schedules a future publishedAt: PUBLISHED with that exact future date', async () => {
      const post = buildPost();
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id, FUTURE);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: FUTURE,
          status: BLOG_POST_STATUS.PUBLISHED,
        }),
      );
      expect(FUTURE.getTime()).toBeGreaterThan(Date.now());
    });

    it('honours an explicit past publishedAt (backdating)', async () => {
      const post = buildPost();
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id, PAST);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: PAST }),
      );
    });

    it('keeps the original date when re-publishing an already published post', async () => {
      const post = buildPost({
        publishedAt: PAST,
        status: BLOG_POST_STATUS.PUBLISHED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: PAST }),
      );
    });

    it('goes live now when a scheduled (future-dated) post is published without a date', async () => {
      const post = buildPost({
        publishedAt: FUTURE,
        status: BLOG_POST_STATUS.PUBLISHED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ publishedAt: NOW }),
      );
    });

    it('stamps now() when publishing an archived post without a date', async () => {
      const post = buildPost({
        publishedAt: PAST,
        status: BLOG_POST_STATUS.ARCHIVED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.publishPost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: NOW,
          status: BLOG_POST_STATUS.PUBLISHED,
        }),
      );
    });

    it('returns not-found for an unknown post', async () => {
      postRepository.findOneBy.mockResolvedValue(null);

      expect(await service.publishPost('missing')).toMatchObject({
        entity: BLOG_WRITE_ENTITY.POST,
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
    });
  });

  describe('unpublishPost / archivePost', () => {
    it('unpublish returns the post to DRAFT and clears published_at', async () => {
      const post = buildPost({
        publishedAt: PAST,
        status: BLOG_POST_STATUS.PUBLISHED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.unpublishPost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: null,
          status: BLOG_POST_STATUS.DRAFT,
        }),
      );
    });

    it('archive sets ARCHIVED and retains published_at', async () => {
      const post = buildPost({
        publishedAt: PAST,
        status: BLOG_POST_STATUS.PUBLISHED,
      });
      postRepository.findOneBy.mockResolvedValue(post);
      reloadReturns(post);

      await service.archivePost(post.id);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.ARCHIVED,
        }),
      );
    });

    it.each([
      ['unpublishPost', () => service.unpublishPost('missing')],
      ['archivePost', () => service.archivePost('missing')],
    ])('%s returns not-found for an unknown post', async (_name, run) => {
      postRepository.findOneBy.mockResolvedValue(null);

      expect(await run()).toMatchObject({
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
    });
  });

  describe('setPostTags', () => {
    it('replaces the tag set with the tags found for the de-duplicated slugs', async () => {
      const post = buildPost();
      const tags = [
        Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'ops' })),
        Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'news' })),
      ];
      postRepository.findOne.mockResolvedValue(post);
      tagRepository.findBy.mockResolvedValue(tags);

      await service.setPostTags(post.id, ['ops', 'news', 'ops']);

      expect(tagRepository.findBy).toHaveBeenCalledTimes(1);
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tags }),
      );
    });

    it('clears all tags for an empty list without querying tags', async () => {
      const post = buildPost({
        tags: [Object.assign(new BlogTag(), blogTagsFactory.build())],
      });
      postRepository.findOne.mockResolvedValue(post);

      await service.setPostTags(post.id, []);

      expect(tagRepository.findBy).not.toHaveBeenCalled();
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [] }),
      );
    });

    it('returns not-found naming the missing tag slug and does not save', async () => {
      postRepository.findOne.mockResolvedValue(buildPost());
      tagRepository.findBy.mockResolvedValue([
        Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'ops' })),
      ]);

      const result = await service.setPostTags('id', ['ops', 'ghost']);

      expect(result).toEqual({
        entity: BLOG_WRITE_ENTITY.TAG,
        key: 'ghost',
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('returns not-found for an unknown post', async () => {
      postRepository.findOne.mockResolvedValue(null);

      expect(await service.setPostTags('missing', ['ops'])).toMatchObject({
        entity: BLOG_WRITE_ENTITY.POST,
        kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
      });
    });

    it('rejects a malformed tag slug', async () => {
      await expect(service.setPostTags('id', ['Bad Tag'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
