import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import {
  assertBlogSlug,
  assertNotBlank,
} from '../blog-posts/blog-write-validation.ts';
import { BlogAuthor } from './blog-author.entity.ts';

/**
 * Input for {@link BlogAuthorsService.upsertAuthor}. The write replaces the author's fields:
 * an omitted or `null` bio / avatar clears the column. `userId` is deliberately not settable.
 * @public
 */
export interface BlogAuthorUpsertInput {
  readonly avatarUrl?: string | null;
  readonly bio?: string | null;
  readonly displayName: string;
  readonly slug: string;
}

/** @public */
@Injectable()
export class BlogAuthorsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(BlogAuthor)
    private readonly blogAuthorRepository: Repository<BlogAuthor>,
  ) {
    this.logger.debug('🧩 blog-authors 🧩');
  }

  /**
   * @description Returns the TypeORM repository for blog authors. Use for CRUD and queries.
   */
  getRepository(): Repository<BlogAuthor> {
    return this.blogAuthorRepository;
  }

  /**
   * @description Creates the author with `slug`, or replaces its fields when it exists. A
   * single `INSERT ... ON CONFLICT (slug) DO UPDATE`, so a concurrent upsert of the same slug
   * cannot surface a unique violation — a slug collision is the update path, not an error.
   * @throws BadRequestException on a malformed slug or blank display name.
   * @public
   */
  async upsertAuthor(input: BlogAuthorUpsertInput): Promise<BlogAuthor> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.displayName, 'displayName');

    await this.blogAuthorRepository.upsert(
      {
        avatarUrl: input.avatarUrl ?? null,
        bio: input.bio ?? null,
        displayName: input.displayName,
        slug: input.slug,
      },
      { conflictPaths: ['slug'] },
    );
    return this.blogAuthorRepository.findOneByOrFail({ slug: input.slug });
  }
}
