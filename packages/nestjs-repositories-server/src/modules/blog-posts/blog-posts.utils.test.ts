import { describe, expect, it } from 'vitest';

import { createBlogPostsRepositoryMock } from './blog-posts.utils.ts';
import { BLOG_WRITE_ENTITY } from './write-result/write-result.constants.ts';

describe('createBlogPostsRepositoryMock', () => {
  it('starts with an empty feed and admin list', async () => {
    const repository = createBlogPostsRepositoryMock();
    const empty = { endCursor: null, hasNextPage: false, items: [] };

    await expect(repository.findPublished({ first: 5 })).resolves.toEqual(
      empty,
    );
    await expect(repository.findAdminPosts({ first: 5 })).resolves.toEqual(
      empty,
    );
    await expect(repository.findPublishedBySlug('a')).resolves.toBeNull();
    await expect(repository.findStatusById('a')).resolves.toBeNull();
  });

  it('answers not-found to every write on the post', async () => {
    const repository = createBlogPostsRepositoryMock();

    await expect(repository.archivePost('a', null)).resolves.toMatchObject({
      entity: BLOG_WRITE_ENTITY.POST,
      key: 'a',
    });
    await expect(repository.publishPost('b', null)).resolves.toMatchObject({
      key: 'b',
    });
  });

  it('rejects an unstubbed createPost rather than inventing a row', async () => {
    const repository = createBlogPostsRepositoryMock();

    await expect(
      repository.createPost({ bodyMarkdown: '', slug: 'a', title: 'A' }, null),
    ).rejects.toThrow('blog_posts.createPost is not stubbed');
  });
});
