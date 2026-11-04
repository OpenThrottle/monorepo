import type { SitemapEntry } from '@openthrottle/react-router-utils';
import { logger } from '@openthrottle/react-router-utils';

import {
  BlogFeedDocument,
  BlogSitemapPageDocument,
  BlogSitemapTagsDocument,
} from '~/__generated__/graphql';
import { fetchPublicGraphql } from '~/services/graphql.server';

import {
  BLOG_FEED_LIMIT,
  BLOG_SITEMAP_MAX_PAGES,
  BLOG_SITEMAP_PAGE_SIZE,
} from '../config/blog-discovery';
import { toBlogIsoDate } from './blog-format';
import type { BlogFeedPost } from './blog-rss';
import {
  BLOG_BASE_PATH,
  buildBlogPostPath,
  buildBlogTagPath,
} from './blog-urls';

/**
 * Server-only data access for the blog's discovery surfaces (RSS feed and
 * sitemap). The server applies post visibility; nothing here filters.
 */

export interface BlogSitemapResult {
  /** True when the API failed and only the `/blog` index entry is returned. */
  readonly degraded: boolean;
  readonly entries: readonly SitemapEntry[];
}

/** @description The latest visible posts for the RSS feed. */
export const loadBlogFeedPosts = async (): Promise<readonly BlogFeedPost[]> => {
  const { blogPosts } = await fetchPublicGraphql(BlogFeedDocument, {
    first: BLOG_FEED_LIMIT,
  });

  return blogPosts.items;
};

/**
 * A cursor walk is inherently sequential (each page needs the previous page's
 * `endCursor`), so it recurses instead of awaiting inside a loop.
 */
const collectPostEntries = async (config: {
  readonly acc: readonly SitemapEntry[];
  readonly after: string | null;
  readonly page: number;
}): Promise<readonly SitemapEntry[]> => {
  const { acc, after, page } = config;
  const { blogPosts } = await fetchPublicGraphql(BlogSitemapPageDocument, {
    after,
    first: BLOG_SITEMAP_PAGE_SIZE,
  });
  const entries = [
    ...acc,
    ...blogPosts.items.map((post) => ({
      lastmod: toBlogIsoDate(post.updatedAt) ?? undefined,
      path: buildBlogPostPath(post.slug),
    })),
  ];

  if (
    !blogPosts.hasNextPage ||
    !blogPosts.endCursor ||
    page + 1 >= BLOG_SITEMAP_MAX_PAGES
  ) {
    return entries;
  }

  return collectPostEntries({
    acc: entries,
    after: blogPosts.endCursor,
    page: page + 1,
  });
};

/**
 * @description Sitemap entries for the blog: `/blog`, every visible post
 * (`lastmod` = `updatedAt`) and every tag with a visible post. When the API
 * fails the error is logged and only `/blog` is returned (`degraded: true`) so
 * the sitemap still renders its static entries instead of 500ing.
 */
export const loadBlogSitemapEntries = async (): Promise<BlogSitemapResult> => {
  try {
    const [posts, { blogTags }] = await Promise.all([
      collectPostEntries({ acc: [], after: null, page: 0 }),
      fetchPublicGraphql(BlogSitemapTagsDocument),
    ]);

    return {
      degraded: false,
      entries: [
        { path: BLOG_BASE_PATH },
        ...posts,
        ...blogTags.map((tag) => ({ path: buildBlogTagPath(tag.slug) })),
      ],
    };
  } catch (error) {
    logger.error(
      'sitemap: blog entries unavailable, serving static paths',
      error,
    );

    return { degraded: true, entries: [{ path: BLOG_BASE_PATH }] };
  }
};
