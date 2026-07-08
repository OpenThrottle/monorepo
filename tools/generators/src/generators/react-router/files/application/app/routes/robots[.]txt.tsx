import { buildRobotsResponse } from '@openthrottle/react-router-utils';
import type { Route } from '@/app/routes/+types/robots[.]txt';

/**
 * `GET /robots.txt`. New apps default to NOINDEX (assume internal /
 * authenticated). For a public, indexable app, switch to
 * `buildRobotsResponse({ sitemapPath: '/sitemap.xml' })`, add a sitemap route
 * with `buildSitemapResponse`, and emit canonical + OG/Twitter + JSON-LD via
 * `canonicalMeta` / `buildSeoMeta` / `buildOrganizationJsonLd` from
 * `@openthrottle/react-router-utils`.
 */
export const loader = (_args: Route.LoaderArgs): Response =>
  buildRobotsResponse({ disallowAll: true });
