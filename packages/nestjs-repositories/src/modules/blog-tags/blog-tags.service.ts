import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import { applyBlogPostVisibility } from '../blog-posts/blog-post-visibility.ts';
import {
  assertBlogSlug,
  assertNotBlank,
} from '../blog-posts/blog-write-validation.ts';
import { BlogTag } from './blog-tag.entity.ts';

/**
 * Input for {@link BlogTagsService.upsertTag}. The write replaces the tag's fields: an omitted
 * or `null` description clears the column.
 * @public
 */
export interface BlogTagUpsertInput {
  readonly description?: string | null;
  readonly name: string;
  readonly slug: string;
}

/** @public */
@Injectable()
export class BlogTagsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(BlogTag)
    private readonly blogTagRepository: Repository<BlogTag>,
  ) {
    this.logger.debug('🧩 blog-tags 🧩');
  }

  /**
   * @description Returns the TypeORM repository for blog tags. Use for CRUD and queries.
   */
  getRepository(): Repository<BlogTag> {
    return this.blogTagRepository;
  }

  /**
   * @description Tags carried by at least one publicly visible post, ordered by name.
   * Visibility comes from {@link applyBlogPostVisibility} — the rule is not restated here.
   * @public
   */
  async findVisibleTags(): Promise<BlogTag[]> {
    return applyBlogPostVisibility(
      this.blogTagRepository
        .createQueryBuilder('tag')
        .innerJoin('tag.posts', 'post'),
      'post',
    )
      .distinct(true)
      .orderBy('tag.name', 'ASC')
      .addOrderBy('tag.id', 'ASC')
      .getMany();
  }

  /**
   * @description Creates the tag with `slug`, or replaces its fields when it exists. A single
   * `INSERT ... ON CONFLICT (slug) DO UPDATE`, so a concurrent upsert of the same slug cannot
   * surface a unique violation — a slug collision is the update path, not an error.
   * @throws BadRequestException on a malformed slug or blank name.
   * @public
   */
  async upsertTag(input: BlogTagUpsertInput): Promise<BlogTag> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.name, 'name');

    await this.blogTagRepository.upsert(
      {
        description: input.description ?? null,
        name: input.name,
        slug: input.slug,
      },
      { conflictPaths: ['slug'] },
    );
    return this.blogTagRepository.findOneByOrFail({ slug: input.slug });
  }
}
