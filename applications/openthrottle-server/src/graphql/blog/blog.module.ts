/**
 * @description GraphQL feature module for the blog: the public read API (BlogResolver) and the
 * `blog:write` mutations (BlogAdminResolver). Imports the three blog table modules from
 * @openthrottle/nestjs-repositories-server for their repositories, and NestjsRepositoriesServerModule
 * for the roles, users and service-account services the admin resolver authorizes with.
 */

import { Module } from '@nestjs/common';
import {
  BlogAuthorsModule,
  BlogPostsModule,
  BlogTagsModule,
  NestjsRepositoriesServerModule,
  RolesModule,
  ServiceAccountsModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { BlogResolver } from './blog.resolver.ts';
import { BlogAdminResolver } from './blog-admin/blog-admin.resolver.ts';

@Module({
  imports: [
    RolesModule,
    ServiceAccountsModule,
    UsersModule,
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    NestjsRepositoriesServerModule,
  ],
  providers: [BlogAdminResolver, BlogResolver],
})
export class BlogGraphqlModule {}
