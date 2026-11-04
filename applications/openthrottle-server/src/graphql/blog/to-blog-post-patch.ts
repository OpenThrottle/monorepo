/**
 * @description Maps the `UpdateBlogPostInput` to the repository `BlogPostPatch`. `undefined`
 * (field omitted) means unchanged and `null` clears a nullable column; `null` on a required
 * column (slug, title, bodyMarkdown) is rejected as a bad request.
 */

import { BadRequestException } from '@nestjs/common';
import type { BlogPostPatch } from '@openthrottle/nestjs-repositories';

import type { UpdateBlogPostInput } from './blog-admin.input.ts';

const required = (
  field: string,
  value: string | null | undefined,
): string | undefined => {
  if (value === null) {
    throw new BadRequestException(`${field} cannot be null.`);
  }
  return value;
};

export const toBlogPostPatch = (input: UpdateBlogPostInput): BlogPostPatch => ({
  authorSlug: input.authorSlug,
  bodyMarkdown: required('bodyMarkdown', input.bodyMarkdown),
  coverImageAlt: input.coverImageAlt,
  coverImageUrl: input.coverImageUrl,
  excerpt: input.excerpt,
  seoDescription: input.seoDescription,
  seoTitle: input.seoTitle,
  slug: required('slug', input.slug),
  title: required('title', input.title),
});
