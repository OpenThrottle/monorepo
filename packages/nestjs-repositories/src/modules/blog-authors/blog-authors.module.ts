import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { BlogAuthor } from './blog-author.entity.ts';
import { BlogAuthorsService } from './blog-authors.service.ts';

/** @public */
@Module({
  controllers: [],
  exports: [BlogAuthorsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([BlogAuthor])],
  providers: [BlogAuthorsService],
})
export class BlogAuthorsModule {}
