import { buildSitemapResponse } from '@openthrottle/react-router-utils';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import type { Route } from '@/app/routes/+types/sitemap[.]xml';

/**
 * Static, crawlable page routes that aren't represented in `docsManifest`.
 * Kept in sync by hand with the file-based routes under `app/routes/`.
 */
const STATIC_PATHS: readonly string[] = ['/', '/docs', '/demos/layout', '/faq'];

/**
 * `GET /sitemap.xml` — a resource route (loader-only, no default export) that
 * emits an XML sitemap for the public marketing site via the shared
 * {@link buildSitemapResponse} helper. URLs are the absolute canonical forms
 * built from `APP_URL`, covering the static page routes plus every non-draft
 * docs/FAQ entry from `docsManifest`.
 */
export const loader = (_args: Route.LoaderArgs): Response => {
  const docPaths = docsManifest
    .filter((entry) => !entry.draft)
    .map((entry) => entry.path);

  return buildSitemapResponse([...STATIC_PATHS, ...docPaths]);
};
