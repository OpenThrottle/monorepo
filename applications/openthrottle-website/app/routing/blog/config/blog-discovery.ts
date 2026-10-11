/** @description Posts in the RSS feed (latest first). */
export const BLOG_FEED_LIMIT = 20;

/**
 * @description Page size for the sitemap walk. 200 is the API's
 * `LIST_PAGINATION_MAX_LIMIT` (larger values are clamped), so the walk takes
 * one request per 200 posts.
 */
export const BLOG_SITEMAP_PAGE_SIZE = 200;

/** @description Safety stop for the sitemap cursor walk (50 x 200 = 10,000 posts). */
export const BLOG_SITEMAP_MAX_PAGES = 50;

/**
 * @description Cache lifetime (seconds) for a sitemap served without the blog
 * entries because the API failed, so crawlers retry soon.
 */
export const BLOG_SITEMAP_DEGRADED_MAX_AGE_SECONDS = 60;
