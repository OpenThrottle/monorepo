import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogAuthor } from './blog-author.entity.ts';
import { BlogAuthorsRepository } from './blog-authors.repository.ts';

/**
 * @description Registers {@link BlogAuthor} on the default connection and provides
 * {@link BlogAuthorsRepository}.
 * @public
 */
@Module({
  exports: [BlogAuthorsRepository],
  imports: [TypeOrmModule.forFeature([BlogAuthor])],
  providers: [BlogAuthorsRepository],
})
export class BlogAuthorsModule {}
