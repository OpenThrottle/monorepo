import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { applyBlogPostVisibility } from '../blog-posts/visibility/visibility.utils.ts';
import {
  assertBlogSlug,
  assertNotBlank,
} from '../blog-posts/write-validation/write-validation.utils.ts';
import { BlogTag } from './blog-tag.entity.ts';
import type { BlogTagUpsertInput } from './blog-tags.types.ts';

/**
 * @description Data access for the openthrottle `blog_tags` table on the default connection:
 * the `BaseRepository` CRUD plus the public and admin tag lists and the slug upsert. A delete
 * is a soft delete, and the slug is unique among live tags only (`idx_blog_tags_slug_live`).
 * @public
 */
@Injectable()
export class BlogTagsRepository extends BaseRepository<
  BlogTag,
  CreateModelInput<BlogTag>
> {
  protected readonly tableName = 'blog_tags';

  constructor(
    @InjectRepository(BlogTag)
    repository: Repository<BlogTag>,
  ) {
    super(repository);
  }

  /**
   * @description Live tags carried by at least one publicly visible post, ordered by name.
   * Visibility comes from {@link applyBlogPostVisibility}: the rule is not restated here. A
   * soft-deleted tag never appears: TypeORM filters `deleted_at` on the main alias.
   */
  async findVisibleTags(): Promise<BlogTag[]> {
    return applyBlogPostVisibility(
      this.repository.createQueryBuilder('tag').innerJoin('tag.posts', 'post'),
      'post',
    )
      .distinct(true)
      .orderBy('tag.name', 'ASC')
      .addOrderBy('tag.id', 'ASC')
      .getMany();
  }

  /**
   * @description Every live tag (admin read: no visibility rule), ordered by name.
   */
  async findAllTags(): Promise<BlogTag[]> {
    return this.repository.find({ order: { id: 'ASC', name: 'ASC' } });
  }

  /**
   * @description Creates the tag with `slug`, or replaces its fields when a live tag has it. A
   * single `INSERT ... ON CONFLICT (slug) WHERE deleted_at IS NULL DO UPDATE` (the conflict
   * target is the partial unique index over live rows), so a concurrent upsert of the same slug
   * cannot surface a unique violation: a slug collision is the update path, not an error. A
   * soft-deleted tag with the slug never conflicts, so the upsert inserts a fresh row.
   * @throws BadRequestException on a malformed slug or blank name.
   */
  async upsertTag(input: BlogTagUpsertInput): Promise<BlogTag> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.name, 'name');

    await this.repository.upsert(
      {
        description: input.description ?? null,
        name: input.name,
        slug: input.slug,
      },
      { conflictPaths: ['slug'], indexPredicate: 'deleted_at IS NULL' },
    );
    return this.repository.findOneByOrFail({ slug: input.slug });
  }
}
