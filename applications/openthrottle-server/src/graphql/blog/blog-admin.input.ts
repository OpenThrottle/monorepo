/**
 * @description GraphQL inputs for the blog authoring mutations. Slugs are validated by the
 * repository services against the same pattern as the database CHECK constraints
 * (`^[a-z0-9]+(-[a-z0-9]+)*$`), so a malformed slug is a GraphQL error, not a constraint
 * violation. On the update input an omitted field is left unchanged and an explicit `null`
 * clears a nullable column.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

const SLUG_DESCRIPTION = `Lowercase letters, digits and single hyphens (^[a-z0-9]+(-[a-z0-9]+)*$), e.g. "my-first-post".`;

@InputType()
export class CreateBlogPostInput {
  @Field(() => String, {
    description: `Slug of an existing author (see upsertBlogAuthor). Omit for no byline.`,
    nullable: true,
  })
  authorSlug!: string | null | undefined;

  @Field(() => String)
  bodyMarkdown!: string;

  @Field(() => String, { nullable: true })
  coverImageAlt!: string | null | undefined;

  @Field(() => String, { nullable: true })
  coverImageUrl!: string | null | undefined;

  @Field(() => String, { nullable: true })
  excerpt!: string | null | undefined;

  @Field(() => String, { nullable: true })
  seoDescription!: string | null | undefined;

  @Field(() => String, { nullable: true })
  seoTitle!: string | null | undefined;

  @Field(() => String, { description: SLUG_DESCRIPTION })
  slug!: string;

  @Field(() => String)
  title!: string;
}

@InputType({
  description: `Partial update. Omitted fields are unchanged; null clears a nullable field. Status and publishedAt change only through publish / unpublish / archive.`,
})
export class UpdateBlogPostInput {
  @Field(() => String, {
    description: `Slug of an existing author; null removes the byline.`,
    nullable: true,
  })
  authorSlug!: string | null | undefined;

  @Field(() => String, {
    description: `Must not be null.`,
    nullable: true,
  })
  bodyMarkdown!: string | null | undefined;

  @Field(() => String, { nullable: true })
  coverImageAlt!: string | null | undefined;

  @Field(() => String, { nullable: true })
  coverImageUrl!: string | null | undefined;

  @Field(() => Date, {
    description: `The post's updatedAt as last read. When set and the post has changed since, nothing is written and BlogPostStaleWriteError is returned. Omit to skip the check.`,
    nullable: true,
  })
  expectedUpdatedAt!: Date | null | undefined;

  @Field(() => String, { nullable: true })
  excerpt!: string | null | undefined;

  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  seoDescription!: string | null | undefined;

  @Field(() => String, { nullable: true })
  seoTitle!: string | null | undefined;

  @Field(() => String, {
    description: `${SLUG_DESCRIPTION} Must not be null.`,
    nullable: true,
  })
  slug!: string | null | undefined;

  @Field(() => String, {
    description: `Must not be null.`,
    nullable: true,
  })
  title!: string | null | undefined;
}

@InputType()
export class PublishBlogPostInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Date, {
    description: `When the post goes live. Omit (or null) to publish now; a future date schedules the post — it is PUBLISHED but not publicly visible until then.`,
    nullable: true,
  })
  publishedAt!: Date | null | undefined;
}

@InputType()
export class SetBlogPostTagsInput {
  @Field(() => ID)
  postId!: string;

  @Field(() => [String], {
    description: `Slugs of existing tags (see upsertBlogTag). Replaces the post's whole tag set; an empty list removes every tag.`,
  })
  tagSlugs!: string[];
}

@InputType({
  description: `Creates the author with this slug or replaces its fields. Omitted bio / avatarUrl are cleared.`,
})
export class UpsertBlogAuthorInput {
  @Field(() => String, { nullable: true })
  avatarUrl!: string | null | undefined;

  @Field(() => String, { nullable: true })
  bio!: string | null | undefined;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, { description: SLUG_DESCRIPTION })
  slug!: string;
}

@InputType({
  description: `Creates the tag with this slug or replaces its fields. An omitted description is cleared.`,
})
export class UpsertBlogTagInput {
  @Field(() => String, { nullable: true })
  description!: string | null | undefined;

  @Field(() => String)
  name!: string;

  @Field(() => String, { description: SLUG_DESCRIPTION })
  slug!: string;
}
