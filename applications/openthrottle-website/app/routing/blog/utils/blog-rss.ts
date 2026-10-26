import { buildCanonicalUrl } from '@openthrottle/react-router-utils';

import type { BlogFeedQuery } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import { toBlogIsoDate } from './blog-format';
import { BLOG_BASE_PATH, BLOG_FEED_PATH, buildBlogPostPath } from './blog-urls';

export type BlogFeedPost = BlogFeedQuery['blogPosts']['items'][number];

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&apos;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * @description Escapes text for use in XML element content or an attribute
 * value: `& < > " '` become the five predefined entities.
 */
export const escapeXml = (value: string): string =>
  value.replace(/["&'<>]/g, (char) => XML_ENTITIES[char] ?? char);

/**
 * `executeGraphql` revives `DateTime` fields into `Date` objects, so values
 * arrive as `Date` at runtime (and as ISO strings in some tests); `toBlogIsoDate`
 * accepts both.
 */
const toRfc822 = (value: unknown): string | null => {
  const iso = toBlogIsoDate(value);

  return iso ? new Date(iso).toUTCString() : null;
};

const buildTag = (name: string, text: string): string =>
  `<${name}>${escapeXml(text)}</${name}>`;

const buildItem = (post: BlogFeedPost): string => {
  const link = buildCanonicalUrl(buildBlogPostPath(post.slug));
  const description = post.seoDescription || post.excerpt;
  const pubDate = toRfc822(post.publishedAt);

  return [
    '    <item>',
    `      ${buildTag('title', post.title)}`,
    `      ${buildTag('link', link)}`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
    ...(description ? [`      ${buildTag('description', description)}`] : []),
    ...post.tags.map((tag) => `      ${buildTag('category', tag.name)}`),
    ...(post.author
      ? [`      ${buildTag('dc:creator', post.author.displayName)}`]
      : []),
    '    </item>',
  ].join('\n');
};

/** @description Newest `updatedAt` among the posts as RFC-822, if any parse. */
const buildLastBuildDate = (posts: readonly BlogFeedPost[]): string | null => {
  const times = posts
    .map((post) => toBlogIsoDate(post.updatedAt))
    .filter((iso) => iso !== null)
    .map((iso) => new Date(iso).getTime());

  return times.length > 0 ? new Date(Math.max(...times)).toUTCString() : null;
};

/**
 * @description RSS 2.0 document for the blog. Posts are emitted in the given
 * order (newest first from the API); the caller decides which posts are
 * included. Links are absolute canonical URLs. Author names use `dc:creator`
 * because RSS 2.0 `<author>` must be an email address.
 */
export const buildBlogRssXml = (posts: readonly BlogFeedPost[]): string => {
  const { description, language, title } = BLOG_COPY.feed;
  const lastBuildDate = buildLastBuildDate(posts);

  const channel = [
    `    ${buildTag('title', title)}`,
    `    ${buildTag('link', buildCanonicalUrl(BLOG_BASE_PATH))}`,
    `    ${buildTag('description', description)}`,
    `    <language>${language}</language>`,
    ...(lastBuildDate
      ? [`    <lastBuildDate>${lastBuildDate}</lastBuildDate>`]
      : []),
    `    <atom:link href="${escapeXml(buildCanonicalUrl(BLOG_FEED_PATH))}" rel="self" type="application/rss+xml"/>`,
    ...posts.map(buildItem),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n${channel}\n  </channel>\n</rss>\n`;
};
