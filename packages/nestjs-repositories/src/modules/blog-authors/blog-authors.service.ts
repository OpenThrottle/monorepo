import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import {
  assertBlogSlug,
  assertNotBlank,
} from '../blog-posts/write-validation/write-validation.utils.ts';
import { BlogAuthor } from './blog-author.entity.ts';
import type { BlogAuthorUpsertInput } from './blog-authors.types.ts';

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
   * @description Every author (admin read), ordered by display name.
   * @public
   */
  async findAllAuthors(): Promise<BlogAuthor[]> {
    return this.blogAuthorRepository.find({
      order: { displayName: 'ASC', id: 'ASC' },
    });
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
