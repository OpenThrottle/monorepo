import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createBlogAuthorsRepositoryMock } from './blog-authors.utils.ts';

describe('createBlogAuthorsRepositoryMock', () => {
  it('starts with no authors', async () => {
    const repository = createBlogAuthorsRepositoryMock();

    await expect(repository.findAllAuthors()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('rejects an unstubbed upsert rather than inventing a row', async () => {
    const repository = createBlogAuthorsRepositoryMock();

    await expect(
      repository.upsertAuthor({ displayName: 'Ada', slug: 'ada' }),
    ).rejects.toThrow('blog_authors.upsertAuthor is not stubbed');
  });

  it('names the blog_authors table in inherited not-found errors', async () => {
    const repository = createBlogAuthorsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'blog_authors record with ID "a" not found',
    );
  });
});
