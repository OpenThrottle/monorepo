import { buildSitemapResponse } from '@openthrottle/react-router-utils';

import type { Route } from '@/app/routes/+types/sitemap[.]xml';
import { isBlogEnabled } from '~/global/utils/blog-enabled';
import { BLOG_SITEMAP_DEGRADED_MAX_AGE_SECONDS } from '~/routing/blog/config/blog-discovery';
import { loadBlogSitemapEntries } from '~/routing/blog/utils/blog-feeds.server';
import { STATIC_PATHS } from '~/routing/home/data/sitemap-paths';

/**
 * `GET /sitemap.xml` — a resource route (loader-only, no default export) that
 * emits an XML sitemap for the public marketing site via the shared
 * {@link buildSitemapResponse} helper. URLs are the absolute canonical forms
 * built from `APP_URL`, covering the live static page routes.
 *
 * The blog entries (`/blog`, each visible post with `lastmod`, each tag page)
 * are included only while the blog switch is on. If the API call fails the
 * sitemap degrades to the static paths plus `/blog` (logged, short cache)
 * rather than returning a 500.
 */
export const loader = async (_args: Route.LoaderArgs): Promise<Response> => {
  if (!isBlogEnabled()) {
    return buildSitemapResponse(STATIC_PATHS);
  }

  const { degraded, entries } = await loadBlogSitemapEntries();

  return buildSitemapResponse(
    [...STATIC_PATHS, ...entries],
    degraded
      ? { maxAgeSeconds: BLOG_SITEMAP_DEGRADED_MAX_AGE_SECONDS }
      : undefined,
  );
};
