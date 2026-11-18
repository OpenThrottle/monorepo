import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import {
  assertBlogSlug,
  assertNotBlank,
} from '../blog-posts/write-validation/write-validation.utils.ts';
import { BlogAuthor } from './blog-author.entity.ts';
import type { BlogAuthorUpsertInput } from './blog-authors.types.ts';

/**
 * @description Data access for the openthrottle `blog_authors` table on the default
 * connection: the `BaseRepository` CRUD plus the admin list and the slug upsert. A delete is
 * a soft delete, and the slug is unique among live authors only
 * (`idx_blog_authors_slug_live`).
 * @public
 */
@Injectable()
export class BlogAuthorsRepository extends BaseRepository<
  BlogAuthor,
  CreateModelInput<BlogAuthor>
> {
  protected readonly tableName = 'blog_authors';

  constructor(
    @InjectRepository(BlogAuthor)
    repository: Repository<BlogAuthor>,
  ) {
    super(repository);
  }

  /**
   * @description Every live author (admin read), ordered by display name.
   */
  async findAllAuthors(): Promise<BlogAuthor[]> {
    return this.repository.find({
      order: { displayName: 'ASC', id: 'ASC' },
    });
  }

  /**
   * @description Creates the author with `slug`, or replaces its fields when a live author has
   * it. A single `INSERT ... ON CONFLICT (slug) WHERE deleted_at IS NULL DO UPDATE` (the
   * conflict target is the partial unique index over live rows), so a concurrent upsert of the
   * same slug cannot surface a unique violation: a slug collision is the update path, not an
   * error. A soft-deleted author with the slug never conflicts, so the upsert inserts a fresh
   * row.
   * @throws BadRequestException on a malformed slug or blank display name.
   */
  async upsertAuthor(input: BlogAuthorUpsertInput): Promise<BlogAuthor> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.displayName, 'displayName');

    await this.repository.upsert(
      {
        avatarUrl: input.avatarUrl ?? null,
        bio: input.bio ?? null,
        displayName: input.displayName,
        slug: input.slug,
      },
      { conflictPaths: ['slug'], indexPredicate: 'deleted_at IS NULL' },
    );
    return this.repository.findOneByOrFail({ slug: input.slug });
  }
}
