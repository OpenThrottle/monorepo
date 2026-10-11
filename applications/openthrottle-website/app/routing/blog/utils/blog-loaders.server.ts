import { data, redirect } from 'react-router';

import type {
  BlogIndexQuery,
  BlogPostQuery,
  BlogTagQuery,
} from '~/__generated__/graphql';
import {
  BlogIndexDocument,
  BlogPostDocument,
  BlogTagDocument,
} from '~/__generated__/graphql';
import { assertBlogEnabled } from '~/global/utils/blog-enabled';
import { fetchPublicGraphql } from '~/services/graphql.server';

import { BLOG_PAGE_SIZE } from '../config/blog-pagination';
import { isInvalidBlogCursorError } from './blog-cursor';
import { BLOG_BASE_PATH, buildBlogTagPath } from './blog-urls';

/**
 * Loader-side data access for the public blog routes. Server-only (`.server`):
 * every request goes through `fetchPublicGraphql`, never from the browser.
 *
 * Gate: every loader first calls `assertBlogEnabled()`, so while
 * `FEATURE_BLOG_ENABLED` is off the blog routes 404 without touching the API.
 *
 * Failure policy:
 * - an unknown or non-public post slug, and an unknown or hidden tag slug,
 *   throw a 404 `data()` response (rendered by `BlogErrorBoundary`);
 * - a malformed `?after=` cursor redirects to the first page of that list;
 * - anything else (API down, timeout) rejects and reaches the error boundary.
 */

const redirectOnInvalidCursor = async <T>(config: {
  readonly after: string | null;
  readonly basePath: string;
  readonly run: () => Promise<T>;
}): Promise<T> => {
  const { after, basePath, run } = config;

  try {
    return await run();
  } catch (error) {
    if (after !== null && isInvalidBlogCursorError(error)) {
      throw redirect(basePath);
    }

    throw error;
  }
};

export interface BlogIndexData {
  readonly after: string | null;
  readonly page: BlogIndexQuery['blogPosts'];
}

export interface BlogPostData {
  readonly post: NonNullable<BlogPostQuery['blogPost']>;
}

export interface BlogTagData {
  readonly after: string | null;
  readonly page: BlogTagQuery['blogPosts'];
  readonly tag: BlogTagQuery['blogTags'][number];
}

/** @description Reads the `after` cursor from a list request URL. */
export const readBlogCursor = (url: URL): string | null =>
  url.searchParams.get('after') || null;

/** @description One page of visible posts for `/blog`. */
export const loadBlogIndex = async (config: {
  readonly after: string | null;
}): Promise<BlogIndexData> => {
  assertBlogEnabled();

  const { after } = config;
  const { blogPosts } = await redirectOnInvalidCursor({
    after,
    basePath: BLOG_BASE_PATH,
    run: () =>
      fetchPublicGraphql(BlogIndexDocument, { after, first: BLOG_PAGE_SIZE }),
  });

  return { after, page: blogPosts };
};

/** @description One visible post for `/blog/<slug>`; 404 when not public. */
export const loadBlogPost = async (config: {
  readonly slug: string;
}): Promise<BlogPostData> => {
  assertBlogEnabled();

  const { blogPost } = await fetchPublicGraphql(BlogPostDocument, {
    slug: config.slug,
  });

  if (blogPost == null) {
    throw data(null, { status: 404 });
  }

  return { post: blogPost };
};

/**
 * @description One page of a tag's visible posts for `/blog/tags/<slug>`. The
 * tag must be among the visible tags (a tag carried only by drafts, or one
 * that does not exist, is a 404).
 */
export const loadBlogTag = async (config: {
  readonly after: string | null;
  readonly tagSlug: string;
}): Promise<BlogTagData> => {
  assertBlogEnabled();

  const { after, tagSlug } = config;
  const { blogPosts, blogTags } = await redirectOnInvalidCursor({
    after,
    basePath: buildBlogTagPath(tagSlug),
    run: () =>
      fetchPublicGraphql(BlogTagDocument, {
        after,
        first: BLOG_PAGE_SIZE,
        tagSlug,
      }),
  });
  const tag = blogTags.find((candidate) => candidate.slug === tagSlug);

  if (tag === undefined) {
    throw data(null, { status: 404 });
  }

  return { after, page: blogPosts, tag };
};
