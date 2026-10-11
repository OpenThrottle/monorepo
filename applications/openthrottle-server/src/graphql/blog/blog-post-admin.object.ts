/**
 * @description Admin-facing GraphQL shape of a blog post, returned by the `blog:write`
 * mutations. Unlike the public `BlogPostObject` it carries internal state (`status`, `createdAt`)
 * so an editor can see whether a post is a draft, live, scheduled or archived. It reuses the
 * public author and tag objects, which are keyed by slug — the identifier every write takes.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { BlogPostStatus } from '@openthrottle/nestjs-repositories';

import { BlogAuthorObject } from './blog-author.object.ts';
import { BlogPostStatusEnum } from './blog-post-status.enum.ts';
import { BlogTagObject } from './blog-tag.object.ts';

@ObjectType()
export class BlogPostAdminObject {
  @Field(() => BlogAuthorObject, { nullable: true })
  author!: BlogAuthorObject | null;

  @Field(() => String)
  bodyMarkdown!: string;

  @Field(() => String, { nullable: true })
  coverImageAlt!: string | null;

  @Field(() => String, { nullable: true })
  coverImageUrl!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  excerpt!: string | null;

  @Field(() => ID)
  id!: string;

  @Field(() => Date, {
    description: `When the post goes (or went) live. Null for drafts. A PUBLISHED post with a value in the future is scheduled and not yet publicly visible.`,
    nullable: true,
  })
  publishedAt!: Date | null;

  @Field(() => String, { nullable: true })
  seoDescription!: string | null;

  @Field(() => String, { nullable: true })
  seoTitle!: string | null;

  @Field(() => String)
  slug!: string;

  @Field(() => BlogPostStatusEnum)
  status!: BlogPostStatus;

  @Field(() => [BlogTagObject])
  tags!: BlogTagObject[];

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}
