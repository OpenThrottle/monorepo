/**
 * @description Fishery factory for {@link BlogPost}. Use in tests to build mock blog posts.
 * Defaults to a visible post (PUBLISHED, `publishedAt` in the past).
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import type { BlogPostData } from './blog-post.entity.ts';

/**
 * Factory for building BlogPost-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ status: 'DRAFT', publishedAt: null }) or .buildList(3).
 */
export const blogPostsFactory = Factory.define<BlogPostData>(
  ({ sequence }) => ({
    authorId: faker.string.uuid(),
    bodyMarkdown: faker.lorem.paragraphs(2),
    coverImageAlt: faker.lorem.sentence(),
    coverImageUrl: faker.image.url(),
    createdAt: faker.date.past(),
    excerpt: faker.lorem.sentence(),
    id: faker.string.uuid(),
    publishedAt: faker.date.past(),
    seoDescription: faker.lorem.sentence(),
    seoTitle: faker.lorem.words(4),
    slug: `post-${sequence}`,
    status: BLOG_POST_STATUS.PUBLISHED,
    title: faker.lorem.words(5),
    updatedAt: faker.date.recent(),
  }),
);
