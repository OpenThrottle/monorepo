/**
 * @description Public GraphQL shapes for blog posts: the post itself and the cursor-paginated
 * list envelope. `status` is intentionally not exposed — every post reachable through the public
 * queries is PUBLISHED by construction.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import { BlogAuthorObject } from './blog-author.object.ts';
import { BlogTagObject } from './blog-tag.object.ts';

@ObjectType()
export class BlogPostObject {
  @Field(() => BlogAuthorObject, { nullable: true })
  author!: BlogAuthorObject | null;

  @Field(() => String)
  bodyMarkdown!: string;

  @Field(() => String, { nullable: true })
  coverImageAlt!: string | null;

  @Field(() => String, { nullable: true })
  coverImageUrl!: string | null;

  @Field(() => String, { nullable: true })
  excerpt!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => Date, { nullable: true })
  publishedAt!: Date | null;

  @Field(() => Int, {
    description: `Estimated reading time in whole minutes (~200 words per minute, minimum 1)`,
  })
  readingTimeMinutes!: number;

  @Field(() => String, { nullable: true })
  seoDescription!: string | null;

  @Field(() => String, { nullable: true })
  seoTitle!: string | null;

  @Field(() => String)
  slug!: string;

  @Field(() => [BlogTagObject])
  tags!: BlogTagObject[];

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

/** @description ListResult-style cursor envelope for publicly visible blog posts, newest first. */
@ObjectType()
export class BlogPostListResult {
  @Field(() => String, {
    description: `Opaque cursor of the last item; pass as \`after\` to fetch the next page. Null when the page is empty.`,
    nullable: true,
  })
  endCursor!: string | null;

  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => [BlogPostObject])
  items!: BlogPostObject[];
}
