import { buildCanonicalUrl } from '~/global/utils/canonical';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import type { Route } from '@/app/routes/+types/sitemap[.]xml';

/**
 * Static, crawlable page routes that aren't represented in `docsManifest`.
 * Kept in sync by hand with the file-based routes under `app/routes/`.
 */
const STATIC_PATHS: readonly string[] = ['/', '/docs', '/demos/layout', '/faq'];

/**
 * `GET /sitemap.xml` — a resource route (loader-only, no default export) that
 * emits an XML sitemap for the public marketing site. URLs are the absolute
 * canonical forms built from `APP_URL`, covering the static page routes plus
 * every non-draft docs/FAQ entry from `docsManifest`.
 */
export const loader = (_args: Route.LoaderArgs): Response => {
  const docPaths = docsManifest
    .filter((entry) => !entry.draft)
    .map((entry) => entry.path);

  const paths = [...new Set([...STATIC_PATHS, ...docPaths])].sort();

  const urls = paths
    .map(
      (path) => `  <url>\n    <loc>${buildCanonicalUrl(path)}</loc>\n  </url>`,
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/xml',
    },
  });
};
