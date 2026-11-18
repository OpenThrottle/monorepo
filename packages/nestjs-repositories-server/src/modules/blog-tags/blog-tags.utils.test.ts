import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createBlogTagsRepositoryMock } from './blog-tags.utils.ts';

describe('createBlogTagsRepositoryMock', () => {
  it('starts with no tags', async () => {
    const repository = createBlogTagsRepositoryMock();

    await expect(repository.findAllTags()).resolves.toEqual([]);
    await expect(repository.findVisibleTags()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('rejects an unstubbed upsert rather than inventing a row', async () => {
    const repository = createBlogTagsRepositoryMock();

    await expect(
      repository.upsertTag({ name: 'Ops', slug: 'ops' }),
    ).rejects.toThrow('blog_tags.upsertTag is not stubbed');
  });

  it('names the blog_tags table in inherited not-found errors', async () => {
    const repository = createBlogTagsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'blog_tags record with ID "a" not found',
    );
  });
});
