import { buildSitemapResponse } from '@openthrottle/react-router-utils';
import { STATIC_PATHS } from '~/routing/home/data/sitemap-paths';
import type { Route } from '@/app/routes/+types/sitemap[.]xml';

/**
 * `GET /sitemap.xml` — a resource route (loader-only, no default export) that
 * emits an XML sitemap for the public marketing site via the shared
 * {@link buildSitemapResponse} helper. URLs are the absolute canonical forms
 * built from `APP_URL`, covering the live static page routes.
 */
export const loader = (_args: Route.LoaderArgs): Response => {
  const docPaths: string[] = [];
  // const docPaths = docsManifest
  //   .filter((entry) => !entry.draft)
  //   .map((entry) => entry.path);

  return buildSitemapResponse([...STATIC_PATHS, ...docPaths]);
};
