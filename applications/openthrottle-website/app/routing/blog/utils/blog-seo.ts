import {
  buildCanonicalUrl,
  buildSeoMeta,
  canonicalMeta,
} from '@openthrottle/react-router-utils';
import type { MetaDescriptor } from 'react-router';

import type { BlogPostQuery, BlogTagQuery } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import { toBlogIsoDate } from './blog-format';
import {
  BLOG_BASE_PATH,
  BLOG_FEED_PATH,
  buildBlogPostPath,
  buildBlogTagPath,
} from './blog-urls';

type BlogPost = NonNullable<BlogPostQuery['blogPost']>;
type BlogTag = BlogTagQuery['blogTags'][number];

interface BlogPageMetaConfig {
  readonly description: string;
  /** Absolute image URL; omitted so the root share image is inherited. */
  readonly image: string | null | undefined;
  readonly pathname: string;
  /** ISO timestamp; only set on article pages. */
  readonly publishedTime: string | null;
  readonly title: string;
  readonly type: 'article' | 'website';
}

/** @description `<link rel="alternate">` that advertises the RSS feed. */
const buildBlogFeedLink = (): MetaDescriptor => ({
  href: buildCanonicalUrl(BLOG_FEED_PATH),
  rel: 'alternate',
  tagName: 'link',
  title: BLOG_COPY.feed.linkTitle,
  type: 'application/rss+xml',
});

const buildBlogPageMeta = (config: BlogPageMetaConfig): MetaDescriptor[] => {
  const { description, image, pathname, publishedTime, title, type } = config;

  return [
    ...buildSeoMeta({
      description,
      siteName: SITE_TITLE,
      title,
      type,
      url: buildCanonicalUrl(pathname),
      ...(image ? { image } : {}),
    }),
    canonicalMeta(pathname),
    buildBlogFeedLink(),
    ...(publishedTime
      ? [{ content: publishedTime, property: 'article:published_time' }]
      : []),
  ];
};

/** @description Meta descriptors for `/blog`. */
export const buildBlogIndexMeta = (): MetaDescriptor[] =>
  buildBlogPageMeta({
    description: BLOG_COPY.routes.index.description,
    image: null,
    pathname: BLOG_BASE_PATH,
    publishedTime: null,
    title: `${BLOG_COPY.routes.index.title} | ${SITE_TITLE}`,
    type: 'website',
  });

/** @description Meta descriptors for `/blog/tags/<slug>`. */
export const buildBlogTagMeta = (tag: BlogTag): MetaDescriptor[] =>
  buildBlogPageMeta({
    description: tag.description || BLOG_COPY.routes.tag.description(tag.name),
    image: null,
    pathname: buildBlogTagPath(tag.slug),
    publishedTime: null,
    title: `${BLOG_COPY.routes.tag.title(tag.name)} | ${SITE_TITLE}`,
    type: 'website',
  });

/**
 * @description Meta descriptors for `/blog/<slug>`. The title is the
 * editor-written `seoTitle` verbatim (a complete title tag), else
 * `<title> | <site>`. The description prefers `seoDescription`, then the
 * excerpt, then the blog default.
 */
export const buildBlogPostMeta = (post: BlogPost): MetaDescriptor[] =>
  buildBlogPageMeta({
    description:
      post.seoDescription || post.excerpt || BLOG_COPY.routes.index.description,
    image: post.coverImageUrl,
    pathname: buildBlogPostPath(post.slug),
    publishedTime: toBlogIsoDate(post.publishedAt),
    title: post.seoTitle || `${post.title} | ${SITE_TITLE}`,
    type: 'article',
  });
