/**
 * @description GraphQL feature module for the blog: the public read API (BlogResolver) and the
 * `blog:write` mutations (BlogAdminResolver). Imports NestjsRepositoriesModule for the blog
 * repository services.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { BlogResolver } from './blog.resolver.ts';
import { BlogAdminResolver } from './blog-admin.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [BlogAdminResolver, BlogResolver],
})
export class BlogGraphqlModule {}
