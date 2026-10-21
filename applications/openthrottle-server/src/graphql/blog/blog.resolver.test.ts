import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import {
  type BlogAuthor,
  blogAuthorsFactory,
  type BlogPost,
  blogPostsFactory,
  BlogPostsService,
  type BlogTag,
  blogTagsFactory,
  BlogTagsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { BlogResolver } from './blog.resolver.ts';

const author: BlogAuthor = {
  ...blogAuthorsFactory.build({
    displayName: 'Ada Lovelace',
    slug: 'ada',
    userId: '6f9f4a0c-0d02-4b3f-9e1e-2fbbf2a8f8a1',
  }),
};

const tag: BlogTag = {
  ...blogTagsFactory.build({ name: 'Releases', slug: 'releases' }),
  posts: [],
};

const post: BlogPost = {
  ...blogPostsFactory.build({
    bodyMarkdown: Array(450).fill('word').join(' '),
    slug: 'hello-world',
  }),
  author,
  tags: [tag],
};

describe('BlogResolver', () => {
  let resolver: BlogResolver;
  const findPublished = vi.fn<BlogPostsService['findPublished']>();
  const findPublishedBySlug = vi.fn<BlogPostsService['findPublishedBySlug']>();
  const findVisibleTags = vi.fn<BlogTagsService['findVisibleTags']>();

  beforeEach(async () => {
    vi.resetAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        BlogResolver,
        {
          provide: BlogPostsService,
          useValue: createMock<BlogPostsService>({
            findPublished,
            findPublishedBySlug,
          }),
        },
        {
          provide: BlogTagsService,
          useValue: createMock<BlogTagsService>({ findVisibleTags }),
        },
      ],
    }).compile();

    resolver = app.get(BlogResolver);
  });

  describe('blogPost', () => {
    describe('when the service finds a publicly visible post', () => {
      test('returns the mapped post with derived reading time', async () => {
        findPublishedBySlug.mockResolvedValue(post);

        const result = await resolver.blogPost('hello-world');

        expect(findPublishedBySlug).toHaveBeenCalledWith('hello-world');
        expect(result).toMatchObject({
          id: post.id,
          readingTimeMinutes: 3,
          slug: 'hello-world',
          tags: [{ name: 'Releases', slug: 'releases' }],
        });
      });

      test('exposes only the public author fields, never the user link', async () => {
        findPublishedBySlug.mockResolvedValue(post);

        const result = await resolver.blogPost('hello-world');

        expect(result?.author).toEqual({
          avatarUrl: author.avatarUrl,
          bio: author.bio,
          displayName: 'Ada Lovelace',
          slug: 'ada',
        });
        expect(JSON.stringify(result)).not.toContain(author.userId);
      });

      test('does not expose status', async () => {
        findPublishedBySlug.mockResolvedValue(post);

        const result = await resolver.blogPost('hello-world');

        expect(result).not.toHaveProperty('status');
      });

      test('returns a null author when the post has none', async () => {
        findPublishedBySlug.mockResolvedValue({ ...post, author: null });

        const result = await resolver.blogPost('hello-world');

        expect(result?.author).toBeNull();
      });
    });

    describe('when the slug is unknown or the post is not publicly visible', () => {
      test('returns null (draft, archived, scheduled and missing all look identical)', async () => {
        findPublishedBySlug.mockResolvedValue(null);

        const result = await resolver.blogPost('a-draft');

        expect(result).toBeNull();
      });
    });
  });

  describe('blogPosts', () => {
    describe('when posts are visible', () => {
      test('maps the page and passes cursor and tag filter to the service', async () => {
        findPublished.mockResolvedValue({
          endCursor: 'cursor-2',
          hasNextPage: true,
          items: [post],
        });

        const result = await resolver.blogPosts(5, 'cursor-1', 'releases');

        expect(findPublished).toHaveBeenCalledWith({
          after: 'cursor-1',
          first: 5,
          tagSlug: 'releases',
        });
        expect(result.endCursor).toBe('cursor-2');
        expect(result.hasNextPage).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.slug).toBe('hello-world');
        expect(result.items[0]?.author).not.toHaveProperty('userId');
      });
    });

    describe('when nothing is publicly visible', () => {
      test('returns an empty page with a null cursor', async () => {
        findPublished.mockResolvedValue({
          endCursor: null,
          hasNextPage: false,
          items: [],
        });

        const result = await resolver.blogPosts(10, undefined, undefined);

        expect(result).toEqual({
          endCursor: null,
          hasNextPage: false,
          items: [],
        });
      });
    });

    describe('when the service rejects a bad cursor', () => {
      test('propagates the error', async () => {
        findPublished.mockRejectedValue(
          new Error('Invalid pagination cursor.'),
        );

        await expect(
          resolver.blogPosts(10, 'garbage', undefined),
        ).rejects.toThrow('Invalid pagination cursor.');
      });
    });
  });

  describe('blogTags', () => {
    test('maps the visible tags', async () => {
      findVisibleTags.mockResolvedValue([tag]);

      const result = await resolver.blogTags();

      expect(result).toEqual([
        { description: tag.description, name: 'Releases', slug: 'releases' },
      ]);
    });

    test('returns an empty list when no tag has a visible post', async () => {
      findVisibleTags.mockResolvedValue([]);

      await expect(resolver.blogTags()).resolves.toEqual([]);
    });
  });
});
