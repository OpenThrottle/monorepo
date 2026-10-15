/**
 * Pure URL builders for the public blog. Components and (later) route modules
 * build every blog href through these so the URL shape lives in one place.
 */

export const BLOG_BASE_PATH = '/blog';

/** The RSS 2.0 feed (`app/routes/blog.rss[.]xml.tsx`). */
export const BLOG_FEED_PATH = `${BLOG_BASE_PATH}/rss.xml`;

export const buildBlogPostPath = (slug: string): string =>
  `${BLOG_BASE_PATH}/${encodeURIComponent(slug)}`;

export const buildBlogTagPath = (slug: string): string =>
  `${BLOG_BASE_PATH}/tags/${encodeURIComponent(slug)}`;

/**
 * @description Builds a list-page href. `after: null | undefined` yields the
 * bare `basePath` (the first page); a cursor yields `?after=<cursor>`.
 */
export const buildBlogPageHref = (config: {
  readonly after: string | null | undefined;
  readonly basePath: string;
}): string => {
  const { after, basePath } = config;

  return after ? `${basePath}?after=${encodeURIComponent(after)}` : basePath;
};
